import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAnchorsFromHtml } from '../src/support-html.js';

test('href와 텍스트를 추출한다', () => {
  const html = '<ul><li><a href="/post/1">지원사업 공고</a></li><li><a href="https://x.com/2">AI 바우처</a></li></ul>';
  const anchors = parseAnchorsFromHtml(html);
  assert.equal(anchors.length, 2);
  assert.deepEqual(anchors[0], { text: '지원사업 공고', href: '/post/1' });
  assert.equal(anchors[1].href, 'https://x.com/2');
});

test('앵커 내부 태그를 제거하고 엔티티를 디코드한다', () => {
  const html = '<a href="/a?x=1&amp;y=2"><span class="ic"></span> R&amp;D&nbsp;지원</a>';
  const [anchor] = parseAnchorsFromHtml(html);
  assert.equal(anchor.href, '/a?x=1&y=2');
  assert.equal(anchor.text, 'R&D 지원');
});

test('href 없는 앵커는 무시한다', () => {
  const html = '<a name="top">앵커</a><a href="/real">진짜</a>';
  const anchors = parseAnchorsFromHtml(html);
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].href, '/real');
});

test('앵커가 없으면 빈 배열', () => {
  assert.deepEqual(parseAnchorsFromHtml('<div>no links</div>'), []);
});
