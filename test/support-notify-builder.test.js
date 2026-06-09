import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSupportNotifyPayload, chunkBlocks } from '../src/support-notify-builder.js';

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

test('한 그룹 글이 많아도 섹션 텍스트는 3000자 한도를 넘지 않는다', () => {
  const posts = Array.from({ length: 200 }, (_, i) => ({
    title: `지원사업 공고 제목이 제법 길어서 누적되는 케이스 ${i}`,
    url: `https://example.com/post/${i}`,
    keyword: '지원'
  }));

  const payload = buildSupportNotifyPayload([
    { org: '대량기관', sourceUrl: 'https://example.com/list', posts }
  ]);

  const sections = payload.blocks.filter((b) => b.type === 'section');
  assert.ok(sections.length > 1, '여러 섹션 블록으로 분할되어야 한다');
  for (const block of sections) {
    assert.ok(block.text.text.length <= 3000, `섹션 텍스트가 3000자를 넘음: ${block.text.text.length}`);
  }
  assert.equal(payload.meta.totalPosts, 200);
});

test('chunkBlocks는 메시지당 블록 수를 한도 이하로 나눈다', () => {
  const blocks = Array.from({ length: 100 }, (_, i) => ({ type: 'section', text: { type: 'mrkdwn', text: `${i}` } }));
  const chunks = chunkBlocks(blocks);
  assert.ok(chunks.length >= 3, '100블록은 여러 메시지로 나뉘어야 한다');
  for (const chunk of chunks) assert.ok(chunk.length <= 45, '한 메시지가 45블록을 넘으면 안 된다');
  assert.equal(chunks.flat().length, 100, '블록 총량은 보존되어야 한다');
});

test('블록이 한도 이하면 단일 메시지', () => {
  const payload = buildSupportNotifyPayload([
    { org: 'X', sourceUrl: 'https://example.com', posts: [{ title: 'a', url: 'https://example.com/1', keyword: 'a' }] }
  ]);
  assert.equal(chunkBlocks(payload.blocks).length, 1);
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
