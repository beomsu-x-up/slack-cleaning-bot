// 새 지원사업 게시글 그룹을 Slack 메시지(payload)로 변환한다.
// groups: [{ org, sourceUrl, posts: [{ title, url, keyword }] }]

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Slack section 블록 text는 최대 3000자. 한도에 여유를 두고 청크를 나눈다.
const SECTION_TEXT_LIMIT = 2900;

function sectionBlock(text) {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function truncateLine(line) {
  if (line.length <= SECTION_TEXT_LIMIT) return line;
  return line.slice(0, SECTION_TEXT_LIMIT - 1) + '…';
}

// header + lines를 3000자 한도를 넘지 않는 여러 섹션 블록으로 나눈다.
// header가 빈 문자열이면 글 목록만으로 시작한다.
function linesToSections(header, lines) {
  const blocks = [];
  let current = header;

  for (const raw of lines) {
    const line = truncateLine(raw);
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > SECTION_TEXT_LIMIT) {
      if (current) blocks.push(sectionBlock(current));
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) blocks.push(sectionBlock(current));
  return blocks;
}

// 그룹 하나를 헤더 + 글 목록 섹션 블록(들)로. 첫 블록은 기관 헤더 포함.
function buildGroupBlocks(group) {
  const header = `*${escapeText(group.org)}*  <${group.sourceUrl}|대상 페이지>`;
  const lines = group.posts.map(
    (p) => `• <${p.url}|${escapeText(p.title)}>  _(${escapeText(p.keyword)})_`
  );
  return linesToSections(header, lines);
}

// Slack은 메시지당 블록 최대 50개. 한도에 여유를 두고 여러 메시지로 나눈다.
const MAX_BLOCKS_PER_MESSAGE = 45;

export function chunkBlocks(blocks, size = MAX_BLOCKS_PER_MESSAGE) {
  const chunks = [];
  for (let i = 0; i < blocks.length; i += size) {
    chunks.push(blocks.slice(i, i + size));
  }
  return chunks;
}

export function buildSupportNotifyPayload(groups = []) {
  const filledGroups = groups.filter((group) => group.posts.length > 0);
  const totalPosts = filledGroups.reduce((sum, group) => sum + group.posts.length, 0);

  if (totalPosts === 0) {
    return { text: '', blocks: [], meta: { totalPosts: 0 } };
  }

  const headline = `📢 새 지원사업 게시글 ${totalPosts}건`;
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headline, emoji: true }
    }
  ];

  const textLines = [headline];

  for (const group of filledGroups) {
    for (const block of buildGroupBlocks(group)) blocks.push(block);

    textLines.push(`[${group.org}]`);
    for (const p of group.posts) textLines.push(`- ${p.title} (${p.keyword}) ${p.url}`);
  }

  return { text: textLines.join('\n'), blocks, meta: { totalPosts } };
}

// 이유 문자열을 한 줄로 정리하고 너무 길면 자른다.
function oneLineReason(reason, max = 300) {
  const flat = String(reason ?? '알 수 없는 오류').replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}

// 실패 목록을 Slack 알림(payload)으로. failures: [{ label, reason }]
// whenLabel: 사람이 읽는 시각 문자열(KST).
export function buildFailureNotifyPayload(failures = [], whenLabel = '') {
  if (!failures.length) return { text: '', blocks: [], meta: { totalFailures: 0 } };

  const title = `⚠️ 지원사업 알림 일부 실패 ${failures.length}건`;
  const intro = `${whenLabel ? whenLabel + ' · ' : ''}아래 대상을 이번 회차에서 건너뛰었습니다. 다음 회차에 자동 재시도됩니다.`;
  const lines = failures.map((f) => `• *${escapeText(f.label)}* — ${escapeText(oneLineReason(f.reason))}`);

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: title, emoji: true } },
    ...linesToSections(intro, lines)
  ];

  const textLines = [title, intro.replace(/[*_<>]/g, '')];
  for (const f of failures) textLines.push(`- ${f.label}: ${oneLineReason(f.reason)}`);

  return { text: textLines.join('\n'), blocks, meta: { totalFailures: failures.length } };
}
