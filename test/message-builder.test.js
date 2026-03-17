import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWeeklyDutyPayload } from '../src/message-builder.js';

test('첫째 주 메시지를 강조한다', () => {
  const payload = buildWeeklyDutyPayload({
    date: new Date('2026-03-02T09:00:00+09:00'),
    timeZone: 'Asia/Seoul'
  });

  assert.equal(payload.meta.currentAssignment.label, '매월 첫째 주');
  assert.match(payload.text, /매월 첫째 주 \| 이용수, 김한수/);
  assert.match(payload.blocks[4].text.text, /👉 \*첫째 주\*  이용수, 김한수/);
});

test('다섯째 주도 올바르게 계산한다', () => {
  const payload = buildWeeklyDutyPayload({
    date: new Date('2026-03-30T09:00:00+09:00'),
    timeZone: 'Asia/Seoul',
    broadcast: 'channel'
  });

  assert.equal(payload.meta.currentAssignment.label, '매월 다섯째 주');
  assert.match(payload.text, /<!channel> 2026년 3월 다섯째 주 담당 안내/);
  assert.match(payload.blocks[1].text.text, /<!channel> \*이번 주 담당\*/);
});
