import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlantReminderPayload } from '../src/plant-reminder-builder.js';

test('금요일 식물 물주기 메시지를 만든다', () => {
  const payload = buildPlantReminderPayload({
    broadcast: 'here',
    plantEmoji: ':herb:',
    waterEmoji: ':sweat_drops:'
  });

  assert.match(payload.text, /<!here> 금요일 식물 물주기 알림/);
  assert.match(payload.blocks[1].text.text, /:herb: :sweat_drops: 식물에 물을 주세요\./);
});
