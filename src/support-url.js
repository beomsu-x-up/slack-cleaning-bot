// 게시글 URL을 절대경로로 변환하고 중복 키로 쓸 수 있게 정규화한다.

export function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

// 중복 판별용 정규화: 프로토콜/호스트 소문자, fragment 제거, 경로 끝 슬래시 제거
// (루트 제외). 쿼리스트링은 게시글 id가 담기는 경우가 많아 보존한다.
export function normalizeUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return String(rawUrl).trim();
  }

  url.hash = '';
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url.toString();
}
