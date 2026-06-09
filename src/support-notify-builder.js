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

// 그룹 하나를 3000자 한도를 넘지 않도록 여러 섹션 블록으로 나눈다.
// 첫 블록은 기관 헤더 + 글 목록, 이어지는 블록은 헤더 반복 없이 글 목록만.
function buildGroupBlocks(group) {
  const header = `*${escapeText(group.org)}*  <${group.sourceUrl}|대상 페이지>`;
  const lines = group.posts.map(
    (p) => truncateLine(`• <${p.url}|${escapeText(p.title)}>  _(${escapeText(p.keyword)})_`)
  );

  const blocks = [];
  let current = header;

  for (const line of lines) {
    const candidate = `${current}\n${line}`;
    if (candidate.length > SECTION_TEXT_LIMIT) {
      blocks.push(sectionBlock(current));
      current = line;
    } else {
      current = candidate;
    }
  }
  blocks.push(sectionBlock(current));
  return blocks;
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
