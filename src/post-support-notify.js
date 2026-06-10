import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { pathToFileURL } from 'node:url';

import {
  resolveTargetCollection,
  fetchTargets,
  fetchSeenUrls,
  insertSeen,
  toList,
  fields
} from './support-directus.js';
import { normalizeUrl } from './support-url.js';
import { createBrowser, scrapeTarget } from './support-scrape.js';
import {
  buildSupportNotifyPayload,
  buildFailureNotifyPayload,
  chunkBlocks
} from './support-notify-builder.js';

function buildRecord(targetId, post) {
  return {
    target_id: targetId,
    post_url: post.url,
    post_title: post.title,
    matched_keyword: post.keyword
  };
}

function nowKstLabel() {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// 읽기 전용: 대상을 순회하며 매칭/신규/부트스트랩 여부를 계산한다.
// 대상별로 격리해서, 한 대상이 실패해도 나머지는 계속 처리하고 실패는 failures에 모은다.
async function planTargets(browser, failures) {
  const collection = await resolveTargetCollection();
  const targets = await fetchTargets(collection);
  console.log(`대상 ${targets.length}건 로드 (컬렉션: ${collection})`);

  const plans = [];

  for (const target of targets) {
    const id = target.id;
    const link = target[fields.link];
    const keywords = toList(target[fields.keyword]);
    const org = toList(target[fields.org]).join(', ') || '(기관 미지정)';

    if (target.status && ['draft', 'archived'].includes(target.status)) continue;
    if (!link || keywords.length === 0) {
      console.log(`건너뜀 (링크/키워드 없음): id=${id}`);
      continue;
    }

    try {
      // 스크래핑과 seen 조회를 한 단위로 격리. 둘 중 무엇이 실패해도 이 대상만 건너뛴다.
      const matched = await scrapeTarget(browser, link, keywords);
      const seen = await fetchSeenUrls(id);
      const fresh = matched.filter((p) => !seen.has(normalizeUrl(p.url)));
      const isBootstrap = seen.size === 0;

      console.log(
        `id=${id} 매칭 ${matched.length} / 신규 ${fresh.length}` +
          (isBootstrap ? ' (부트스트랩)' : '')
      );

      plans.push({ id, org, sourceUrl: link, fresh, isBootstrap });
    } catch (error) {
      console.error(`대상 처리 실패 id=${id} ${link}: ${error.message}`);
      failures.push({ label: `${org} (id=${id})`, reason: error.message });
    }
  }

  return plans;
}

function resolveSlackTarget() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_SUPPORT_CHANNEL_ID || process.env.SLACK_CHANNEL_ID;
  if (!token) throw new Error('SLACK_BOT_TOKEN is not set.');
  if (!channel) throw new Error('SLACK_SUPPORT_CHANNEL_ID(또는 SLACK_CHANNEL_ID)가 필요합니다.');
  return { client: new WebClient(token), channel };
}

// blocks를 50블록 한도에 맞춰 여러 메시지로 나눠 전송. 첫 메시지만 전체 fallback text.
async function postPayload(client, channel, payload) {
  const headline = payload.text.split('\n')[0];
  const messages = chunkBlocks(payload.blocks);
  for (let i = 0; i < messages.length; i++) {
    await client.chat.postMessage({
      channel,
      text: i === 0 ? payload.text : headline,
      blocks: messages[i]
    });
  }
  return messages.length;
}

// 부트스트랩/전송후 기록. 개별 insert 실패는 failures에 모으고 계속 진행한다.
async function recordSeen(plan, failures) {
  for (const post of plan.fresh) {
    try {
      await insertSeen(buildRecord(plan.id, post));
    } catch (error) {
      failures.push({ label: `기록 실패 id=${plan.id}`, reason: `${post.url} — ${error.message}` });
    }
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const failures = [];

  // 1) 수집 단계. 대상 목록 로드 자체가 실패하면 진행은 못 하지만 죽지 않고 실패로 기록.
  const browser = await createBrowser();
  let plans = [];
  try {
    plans = await planTargets(browser, failures);
  } catch (error) {
    console.error(`대상 목록 로드 실패: ${error.message}`);
    failures.push({ label: '대상 목록 로드', reason: error.message });
  } finally {
    await browser.close();
  }

  // 알림 대상은 부트스트랩이 아닌 대상의 신규 글만.
  const notifyGroups = plans
    .filter((plan) => !plan.isBootstrap && plan.fresh.length > 0)
    .map((plan) => ({ org: plan.org, sourceUrl: plan.sourceUrl, posts: plan.fresh }));
  const payload = buildSupportNotifyPayload(notifyGroups);

  if (isDryRun) {
    const bootstrapCount = plans
      .filter((p) => p.isBootstrap)
      .reduce((sum, p) => sum + p.fresh.length, 0);
    console.log('\n=== DRY RUN (전송/기록 안 함) ===');
    console.log(`부트스트랩으로 기록될 글: ${bootstrapCount}건`);
    console.log(`알림 보낼 글: ${payload.meta.totalPosts}건`);
    console.log(`실패: ${failures.length}건`);
    if (payload.meta.totalPosts > 0) console.log('\n--- text ---\n' + payload.text);
    if (failures.length > 0) {
      const f = buildFailureNotifyPayload(failures, nowKstLabel());
      console.log('\n--- 실패 알림 text ---\n' + f.text);
    }
    return;
  }

  // 2) 부트스트랩 기록 (알림 없이 현재 글을 기록만). 개별 실패는 모으고 계속.
  for (const plan of plans.filter((p) => p.isBootstrap)) {
    await recordSeen(plan, failures);
    if (plan.fresh.length > 0) console.log(`부트스트랩 기록 id=${plan.id}: ${plan.fresh.length}건`);
  }

  // 3) 신규 글 알림 전송 → 성공 시에만 seen 기록(실패 시 다음 회차 재시도).
  if (payload.meta.totalPosts > 0) {
    try {
      const { client, channel } = resolveSlackTarget();
      const msgCount = await postPayload(client, channel, payload);
      console.log(`Posted ${payload.meta.totalPosts} support posts to ${channel} (${msgCount} msg)`);

      for (const plan of plans.filter((p) => !p.isBootstrap)) {
        await recordSeen(plan, failures);
      }
    } catch (error) {
      console.error(`알림 전송 실패: ${error.message}`);
      failures.push({ label: '신규 글 알림 전송', reason: error.message });
    }
  } else {
    console.log('알릴 새 글이 없습니다.');
  }

  // 4) 실패가 있으면 시각·이유를 Slack으로 통지. 통지까지 실패하면 마지막 신호로 throw.
  if (failures.length > 0) {
    console.error(`총 ${failures.length}건 실패:`);
    for (const f of failures) console.error(`  - ${f.label}: ${f.reason}`);

    const failurePayload = buildFailureNotifyPayload(failures, nowKstLabel());
    const { client, channel } = resolveSlackTarget();
    await postPayload(client, channel, failurePayload);
    console.log(`실패 요약 ${failures.length}건을 ${channel}에 통지`);
  }
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error) => {
    // 여기까지 왔다면 실패 통지조차 실패한 경우 → 워크플로에 빨간 신호를 남긴다.
    console.error('치명적 오류 (실패 통지 불가):', error);
    process.exitCode = 1;
  });
}
