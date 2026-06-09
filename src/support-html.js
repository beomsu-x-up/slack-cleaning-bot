// 직렬화된 HTML 문자열에서 앵커(text, href)를 추출한다.
// 일부 사이트(예: CCEI)가 전역 Map/Array 등을 오염시켜 page.evaluate 기반
// DOM 추출이 깨질 때의 폴백 경로. 페이지 JS에 의존하지 않는다.

const ANCHOR_RE = /<a\b[^>]*\bhref\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' '
};

function decodeEntities(text) {
  return text
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function parseAnchorsFromHtml(html) {
  const anchors = [];
  let match;
  while ((match = ANCHOR_RE.exec(html)) !== null) {
    const href = decodeEntities(match[1]);
    const text = decodeEntities(match[2].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    anchors.push({ text, href });
  }
  return anchors;
}
