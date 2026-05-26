// 새 지원사업 게시글 그룹을 Slack 메시지(payload)로 변환한다.
// groups: [{ org, sourceUrl, posts: [{ title, url, keyword }] }]

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    const lines = group.posts
      .map((p) => `• <${p.url}|${escapeText(p.title)}>  _(${escapeText(p.keyword)})_`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${escapeText(group.org)}*  <${group.sourceUrl}|대상 페이지>\n${lines}`
      }
    });

    textLines.push(`[${group.org}]`);
    for (const p of group.posts) textLines.push(`- ${p.title} (${p.keyword}) ${p.url}`);
  }

  return { text: textLines.join('\n'), blocks, meta: { totalPosts } };
}
