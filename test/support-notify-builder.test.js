import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSupportNotifyPayload } from '../src/support-notify-builder.js';

test('새 글이 없으면 totalPosts 0', () => {
  const payload = buildSupportNotifyPayload([]);
  assert.equal(payload.meta.totalPosts, 0);
  assert.deepEqual(payload.blocks, []);
});

test('그룹별 게시글을 헤더+섹션으로 묶는다', () => {
  const payload = buildSupportNotifyPayload([
    {
      org: 'AI바우처',
      sourceUrl: 'https://example.com/list',
      posts: [{ title: 'AI 지원사업 공고', url: 'https://example.com/1', keyword: 'AI' }]
    },
    { org: '빈그룹', sourceUrl: 'https://example.com/empty', posts: [] }
  ]);

  assert.equal(payload.meta.totalPosts, 1);
  assert.match(payload.blocks[0].text.text, /새 지원사업 게시글 1건/);
  assert.match(payload.blocks[1].text.text, /AI바우처/);
  assert.match(payload.blocks[1].text.text, /AI 지원사업 공고/);
  assert.match(payload.text, /AI 지원사업 공고 \(AI\)/);
});

test('제목의 특수문자를 이스케이프한다', () => {
  const payload = buildSupportNotifyPayload([
    {
      org: 'X',
      sourceUrl: 'https://example.com',
      posts: [{ title: 'A & B <test>', url: 'https://example.com/2', keyword: 'A' }]
    }
  ]);
  assert.match(payload.blocks[1].text.text, /A &amp; B &lt;test&gt;/);
});
