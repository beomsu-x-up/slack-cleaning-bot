// Directus REST 접근: 알림 대상 읽기, 컬렉션 자동탐색, scraping_seen read/write.

import { normalizeUrl } from './support-url.js';

const TARGET_DISPLAY_NAME = '지원사업 알림 대상';

function baseUrl() {
  const url = (process.env.DIRECTUS_URL || '').replace(/\/$/, '');
  if (!url) throw new Error('DIRECTUS_URL 환경변수가 필요합니다.');
  return url;
}

function token() {
  const value = process.env.DIRECTUS_TOKEN || '';
  if (!value) throw new Error('DIRECTUS_TOKEN 환경변수가 필요합니다.');
  return value;
}

export const fields = {
  link: process.env.TARGET_LINK_FIELD || 'link',
  keyword: process.env.TARGET_KEYWORD_FIELD || 'keyword',
  org: process.env.TARGET_ORG_FIELD || 'organization'
};

export const seenCollection = process.env.SEEN_COLLECTION || 'scraping_seen';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;
// 일시적 서버 오류: 502/503/504(과부하·재기동), 429(레이트리밋). 재시도로 회복 가능.
const TRANSIENT_STATUS = new Set([429, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(endpoint, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let response;
    try {
      response = await fetch(`${baseUrl()}${endpoint}`, {
        method: options.method || 'GET',
        headers: {
          Authorization: `Bearer ${token()}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } catch (networkError) {
      // fetch 자체 실패(네트워크/DNS/연결 끊김)도 일시적일 수 있어 재시도.
      lastError = networkError;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
        continue;
      }
      throw networkError;
    }

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(`${options.method || 'GET'} ${endpoint} 실패: ${response.status} ${text}`);
      error.status = response.status;

      if (TRANSIENT_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
        console.warn(`Directus ${response.status} 일시 오류, ${waitMs}ms 후 재시도 (${attempt}/${MAX_RETRIES - 1}): ${endpoint}`);
        lastError = error;
        await sleep(waitMs);
        continue;
      }
      throw error;
    }

    if (response.status === 204) return null;
    return response.json();
  }

  throw lastError;
}

// 대상 컬렉션 이름: env 우선, 없으면 한글 표시명으로 자동 탐색.
export async function resolveTargetCollection() {
  if (process.env.TARGET_COLLECTION) return process.env.TARGET_COLLECTION;

  const { data } = await request('/collections');
  const match = data.find((item) =>
    (item.meta?.translations || []).some(
      (t) => (t.translation || '').trim() === TARGET_DISPLAY_NAME
    )
  );

  if (!match) {
    throw new Error(
      `대상 컬렉션을 찾지 못했습니다. TARGET_COLLECTION env로 지정하세요. (표시명 "${TARGET_DISPLAY_NAME}")`
    );
  }
  return match.collection;
}

export async function fetchTargets(collection) {
  const { data } = await request(`/items/${collection}?limit=-1&fields=*`);
  return data;
}

// 태그/CSV/배열 등 어떤 형태든 문자열 배열로 흡수.
export function toList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

export async function fetchSeenUrls(targetId) {
  const { data } = await request(
    `/items/${seenCollection}?limit=-1&fields=post_url&filter[target_id][_eq]=${targetId}`
  );
  return new Set(data.map((row) => normalizeUrl(row.post_url)));
}

export async function insertSeen(record) {
  try {
    await request(`/items/${seenCollection}`, { method: 'POST', body: record });
  } catch (error) {
    // unique 충돌(이미 기록된 URL)은 무시.
    if (error.status !== 400 && error.status !== 409) throw error;
  }
}
