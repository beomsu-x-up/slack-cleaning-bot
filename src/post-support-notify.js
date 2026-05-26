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
import { buildSupportNotifyPayload } from './support-notify-builder.js';

function buildRecord(targetId, post) {
  return {
    target_id: targetId,
    post_url: post.url,
    post_title: post.title,
    matched_keyword: post.keyword
  };
}

// 읽기 전용: 대상을 순회하며 각 대상의 매칭/신규/부트스트랩 여부를 계산한다.
// 쓰기(insertSeen)나 전송은 하지 않는다.
async function planTargets(browser) {
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

    let matched;
    try {
      matched = await scrapeTarget(browser, link, keywords);
    } catch (error) {
      console.error(`스크래핑 실패 id=${id} ${link}: ${error.message}`);
      continue;
    }

    const seen = await fetchSeenUrls(id);
    const fresh = matched.filter((p) => !seen.has(normalizeUrl(p.url)));
    const isBootstrap = seen.size === 0;

    console.log(
      `id=${id} 매칭 ${matched.length} / 신규 ${fresh.length}` +
        (isBootstrap ? ' (부트스트랩)' : '')
    );

    plans.push({ id, org, sourceUrl: link, fresh, isBootstrap });
  }

  return plans;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const browser = await createBrowser();
  let plans;
  try {
    plans = await planTargets(browser);
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
    if (payload.meta.totalPosts > 0) {
      console.log('\n--- text ---\n' + payload.text);
      console.log('\n--- blocks ---\n' + JSON.stringify(payload.blocks, null, 2));
    }
    return;
  }

  // 부트스트랩 대상: 알림 없이 현재 글을 기록만.
  for (const plan of plans.filter((p) => p.isBootstrap)) {
    for (const post of plan.fresh) await insertSeen(buildRecord(plan.id, post));
    if (plan.fresh.length > 0) console.log(`부트스트랩 기록 id=${plan.id}: ${plan.fresh.length}건`);
  }

  if (payload.meta.totalPosts > 0) {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_SUPPORT_CHANNEL_ID || process.env.SLACK_CHANNEL_ID;
    if (!token) throw new Error('SLACK_BOT_TOKEN is not set.');
    if (!channel) throw new Error('SLACK_SUPPORT_CHANNEL_ID(또는 SLACK_CHANNEL_ID)가 필요합니다.');

    const client = new WebClient(token);
    await client.chat.postMessage({ channel, text: payload.text, blocks: payload.blocks });
    console.log(`Posted ${payload.meta.totalPosts} support posts to ${channel}`);

    // 전송 성공 후 기록 (실패 시 다음 run 재시도 가능).
    for (const plan of plans.filter((p) => !p.isBootstrap)) {
      for (const post of plan.fresh) await insertSeen(buildRecord(plan.id, post));
    }
  } else {
    console.log('알릴 새 글이 없습니다.');
  }
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
