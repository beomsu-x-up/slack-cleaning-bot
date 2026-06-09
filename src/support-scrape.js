// Playwright로 대상 페이지를 렌더링(SPA 포함)하고 키워드 매칭 게시글을 추출한다.

import { chromium } from 'playwright';
import { toAbsoluteUrl } from './support-url.js';
import { parseAnchorsFromHtml } from './support-html.js';

const NAV_TIMEOUT_MS = 30_000;
const NETWORK_IDLE_MS = 4_000; // SPA 렌더가 끝날 만큼만 idle 대기 (실패해도 무시)
const SETTLE_MS = 1_500; // idle 이후 JS 추가 렌더 대기
const NAV_RETRIES = 1; // 일시적 타임아웃/연결 리셋 완화용 재시도 횟수

export async function createBrowser() {
  return chromium.launch({ headless: true });
}

// 페이지 진입. 일시적 실패(타임아웃/연결 리셋)는 한 번 재시도한다.
async function navigate(page, pageUrl) {
  for (let attempt = 0; attempt <= NAV_RETRIES; attempt++) {
    try {
      // domcontentloaded로 빠르게 진입한 뒤, networkidle은 짧게만(실패 무시) 기다린다.
      // networkidle을 goto 조건으로 쓰면 광고/애널리틱스가 많은 정부 사이트에서
      // 영영 idle이 안 되어 타임아웃 난다.
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_MS }).catch(() => {});
      await page.waitForTimeout(SETTLE_MS);
      return;
    } catch (error) {
      if (attempt === NAV_RETRIES) throw error;
      await page.waitForTimeout(1_500);
    }
  }
}

// 앵커(text, href) 목록 추출. 1차는 페이지 JS, 실패 시 직렬화 HTML 파싱으로 폴백.
// 일부 사이트(예: CCEI)가 전역 Map/Array 등을 오염시켜 page.evaluate 기반 추출이
// 깨지므로, 페이지 JS에 의존하지 않는 HTML 파싱 경로를 둔다.
async function extractAnchors(page) {
  try {
    const anchors = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'), (el) => ({
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        href: el.getAttribute('href') || ''
      }))
    );
    if (Array.isArray(anchors) && anchors.length > 0) return anchors;
  } catch {
    // 폴백으로 넘어간다.
  }
  return parseAnchorsFromHtml(await page.content());
}

// 한 대상 페이지에서 키워드가 포함된 링크 게시글 목록을 추출.
// 반환: [{ title, url, keyword }]
export async function scrapeTarget(browser, pageUrl, keywords) {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'
  });

  try {
    await navigate(page, pageUrl);

    const anchors = await extractAnchors(page);
    const base = page.url();
    const seenInPage = new Set();
    const matched = [];

    for (const { text, href } of anchors) {
      if (text.length < 3) continue;
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

      const lowerText = text.toLowerCase();
      const keyword = keywords.find((_, i) => lowerText.includes(lowerKeywords[i]));
      if (!keyword) continue;

      const url = toAbsoluteUrl(href, base);
      if (!url || seenInPage.has(url)) continue;
      seenInPage.add(url);

      matched.push({ title: text, url, keyword });
    }

    return matched;
  } finally {
    await page.close();
  }
}
