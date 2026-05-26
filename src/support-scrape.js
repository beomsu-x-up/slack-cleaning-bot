// Playwright로 대상 페이지를 렌더링(SPA 포함)하고 키워드 매칭 게시글을 추출한다.

import { chromium } from 'playwright';
import { toAbsoluteUrl } from './support-url.js';

const NAV_TIMEOUT_MS = 20_000;
const SETTLE_MS = 1_500; // networkidle 이후 JS 추가 렌더 대기

export async function createBrowser() {
  return chromium.launch({ headless: true });
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
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS);

    const anchors = await page.$$eval('a[href]', (els) =>
      els.map((el) => ({
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        href: el.getAttribute('href') || ''
      }))
    );

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
