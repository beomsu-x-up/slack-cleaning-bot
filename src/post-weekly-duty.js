import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { pathToFileURL } from 'node:url';
import { buildWeeklyDutyPayload } from './message-builder.js';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isBuilderJson = process.argv.includes('--builder-json');
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  const timeZone = process.env.SLACK_TIMEZONE || 'Asia/Seoul';
  const broadcast = process.env.SLACK_BROADCAST || '';
  const highlightEmoji = process.env.SLACK_HIGHLIGHT_EMOJI || ':sparkles:';
  const payload = buildWeeklyDutyPayload({
    date: new Date(),
    timeZone,
    broadcast,
    highlightEmoji
  });

  if (isBuilderJson) {
    console.log(
      JSON.stringify(
        {
          blocks: payload.blocks
        },
        null,
        2
      )
    );
    return;
  }

  if (isDryRun) {
    console.log(payload.text);
    console.log('\n--- blocks ---\n');
    console.log(JSON.stringify(payload.blocks, null, 2));
    return;
  }

  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not set.');
  }

  if (!channel) {
    throw new Error('SLACK_CHANNEL_ID is not set.');
  }

  const client = new WebClient(token);

  await client.chat.postMessage({
    channel,
    text: payload.text,
    blocks: payload.blocks
  });

  console.log(`Posted weekly duty message to ${channel}`);
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
