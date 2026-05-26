# Slack 알림 봇

매주 월요일에 주간 담당표를 보내고, 매주 금요일에 식물 물주기 알림을 보내는 예제입니다.

이번 버전은 토스의 글 [슬랙봇 디자인 101](https://toss.tech/article/22439)을 참고해, `열람 전용 봇은 더 단순하고 빨리 읽혀야 한다`는 원칙에 맞춰 메시지 구조를 다시 잡았습니다. 이 글의 핵심을 현재 요구사항에 맞게 적용하면 아래처럼 정리됩니다.

- 버튼 없이 한 번에 읽히는 `Block Kit` 메시지
- 이번 주 담당을 가장 먼저 크게 노출
- 전체 월간 일정은 아래에 압축해서 배치
- 필요하면 워크스페이스 커스텀 이모지로 말투와 톤을 조정

## 1. Slack 앱 만들기

Slack 공식 문서 기준으로 가장 간단한 흐름은 매니페스트로 앱을 만들고, `chat:write` 권한을 포함한 뒤 워크스페이스에 설치하는 방식입니다.

1. Slack 앱 관리 페이지에서 새 앱을 만듭니다.
2. `From an app manifest`를 선택합니다.
3. 이 저장소의 [`slack-app-manifest.yml`](/Users/beomsu/workspace/company/slack-bot/slack-app-manifest.yml) 내용을 붙여 넣습니다.
4. 앱이 생성되면 `Install App` 또는 `OAuth & Permissions` 화면에서 워크스페이스에 설치합니다.
5. 설치 후 `Bot User OAuth Token` 값을 복사합니다. 이 값은 `xoxb-...` 형태입니다.

공식 문서:

- 매니페스트로 앱 만들기: [Configuring apps with app manifests](https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests/)
- 봇 토큰 설명: [Slack tokens](https://docs.slack.dev/authentication/tokens/)

## 2. 채널에 봇 등록하기

이 예제는 최소 권한인 `chat:write`만 사용하므로, 메시지를 보낼 채널에 봇을 초대해야 합니다.

1. Slack에서 봇이 글을 올릴 채널로 이동합니다.
2. 아래 명령으로 봇을 채널에 초대합니다.

```text
/invite @Weekly Duty Bot
```

3. 채널 상세 정보에서 채널 ID를 확인합니다. 보통 `C`로 시작합니다.
4. 이 채널 ID를 `SLACK_CHANNEL_ID`로 사용합니다.

공식 문서:

- 메시지 전송 API: [chat.postMessage](https://docs.slack.dev/reference/methods/chat.postMessage)
- 공개 채널 전체에 쓰고 싶을 때 필요한 추가 권한: [chat.postMessage channel membership note](https://docs.slack.dev/reference/methods/chat.postMessage)

## 3. 로컬에서 테스트하기

### 설치

```bash
npm install
cp .env.example .env
```

`.env`에 값을 채웁니다.

```dotenv
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C0123456789
SLACK_TIMEZONE=Asia/Seoul
```

### 메시지 미리보기

```bash
npm run send:weekly:dry-run
```

### Block Kit Builder용 JSON 출력

토스 글에서도 언급된 것처럼 Slack 메시지는 블록 단위로 설계하는 게 좋습니다. 아래 명령으로 Block Kit Builder에 바로 붙여 넣을 JSON을 출력할 수 있습니다.

```bash
npm run send:weekly:builder
```

### 실제 전송

```bash
npm run send:weekly
```

금요일 식물 물주기 알림도 같은 방식으로 확인할 수 있습니다.

```bash
npm run send:plant:dry-run
npm run send:plant
```

## 4. GitHub Actions로 자동 실행

워크플로 파일은 아래 두 개입니다.

- [`post-weekly-duty.yml`](/Users/beomsu/workspace/company/slack-bot/.github/workflows/post-weekly-duty.yml)
- [`post-plant-reminder.yml`](/Users/beomsu/workspace/company/slack-bot/.github/workflows/post-plant-reminder.yml)

- `cron: '0 0 * * 1'` 는 UTC 기준 월요일 00:00입니다.
- 한국 시간으로는 월요일 09:00입니다.
- `cron: '0 0 * * 5'` 는 UTC 기준 금요일 00:00입니다.
- 한국 시간으로는 금요일 09:00입니다.

GitHub 저장소의 `Settings > Secrets and variables > Actions` 에 아래 시크릿을 등록합니다.

- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`
- `SLACK_PLANT_CHANNEL_ID` 선택 사항. 비워두면 `SLACK_CHANNEL_ID` 채널로 같이 보냅니다.

선택 사항으로 아래 Repository Variables 도 넣을 수 있습니다.

- `SLACK_PLANT_BROADCAST`
- `SLACK_PLANT_EMOJI`
- `SLACK_PLANT_WATER_EMOJI`

등록 후 `Actions` 탭에서 `Post weekly duty schedule` 워크플로를 `Run workflow`로 한 번 수동 실행해보면 됩니다.
식물 알림은 `Post plant watering reminder` 워크플로를 같은 방식으로 실행하면 됩니다.

## 5. 현재 메시지 형식

월요일 날짜가 속한 월의 주차를 기준으로 담당자를 계산합니다.

- 1주차: 이용수, 김한수
- 2주차: 장호민, 정성연
- 3주차: 김범수, 방세현
- 4주차: 구현모, 진민혁, (백승엽)
- 5주차: 백승엽, 이용수

Slack에는 아래와 같은 `읽기 전용 카드형 메시지`로 올라갑니다.

```text
2026년 3월 셋째 주 담당 안내
이번 주 담당
김범수 · 방세현

월별 전체 일정
▫️ 첫째 주  이용수, 김한수
▫️ 둘째 주  장호민, 정성연
👉 셋째 주  김범수, 방세현
▫️ 넷째 주  구현모, 진민혁, (백승엽)
▫️ 다섯째 주  백승엽, 이용수
```

브로드캐스트 멘션이 꼭 필요하면 `.env` 또는 GitHub Actions secret 환경값에 `SLACK_BROADCAST=channel` 또는 `SLACK_BROADCAST=here` 를 넣으면 됩니다. 기본값은 빈 값이며, 불필요한 알림 소음을 줄이기 위해 멘션 없이 보냅니다.

강조 이모지도 바꿀 수 있습니다.

```dotenv
SLACK_HIGHLIGHT_EMOJI=:sparkles:
```

## 6. 디자인 원칙

토스 글과 Slack 공식 문서를 현재 봇에 맞게 적용한 이유는 아래와 같습니다.

- 이 봇은 `설정`이나 `입력`이 없는 단순 열람형이라 버튼이 필요 없습니다.
- Slack 메시지는 HTML이 아니라 블록 기반이라, 텍스트 덩어리보다 `header`, `section`, `context`, `divider` 조합이 읽기 쉽습니다.
- 전체 일정을 모두 보여주되, 사용자가 실제로 봐야 하는 `이번 주 담당`을 맨 위에 둬야 합니다.
- 팀 문화에 맞는 커스텀 이모지를 쓰면 더 빠르게 눈에 들어오게 만들 수 있습니다.

참고 링크:

- 토스 글: [슬랙봇 디자인 101](https://toss.tech/article/22439)
- Slack Block Kit 개요: [Block Kit](https://docs.slack.dev/block-kit)
- Block 종류 참고: [Block Kit blocks reference](https://docs.slack.dev/reference/block-kit/blocks)

## 7. 동작 방식 바꾸기

현재는 `날짜의 일(day)` 기준으로 `1~7일`, `8~14일` 식으로 주차를 계산합니다. 예를 들어 29~31일에 해당하는 월요일은 5주차로 처리됩니다.

메시지 레이아웃이나 문구를 바꾸고 싶다면 [`message-builder.js`](/Users/beomsu/workspace/company/slack-bot/src/message-builder.js)를 수정하면 됩니다.

금요일 식물 물주기 문구를 바꾸고 싶다면 [`plant-reminder-builder.js`](/Users/beomsu/workspace/company/slack-bot/src/plant-reminder-builder.js)를 수정하면 됩니다.

## 8. 지원사업 스크래핑 알림

CMS(Directus)의 "지원사업 알림 대상" 컬렉션(대상 페이지 링크 + 키워드 + 기관)을 매일 아침 09:00 KST에 스크래핑해서, 키워드가 포함된 **새 게시글**을 Slack으로 알립니다.

- 각 대상 페이지를 **Playwright(헤드리스 Chromium)** 로 렌더링 → SSR/SPA 모두 처리.
- 렌더된 DOM 링크 중 텍스트에 키워드가 포함된 게시글을 추출.
- Directus `scraping_seen` 컬렉션과 대조해 **아직 알리지 않은 글만** 전송, 보낸 글은 기록(`post_url` unique → 중복 방지).
- **부트스트랩**: 특정 대상에 기록이 0건이면(최초 실행) 현재 글을 알림 없이 기록만 → 첫날 폭탄 방지. 다음 실행부터 진짜 새 글만 알림.

### 환경변수 (`.env`)

```dotenv
DIRECTUS_URL=https://xup-homepage-cms-9635953230.asia-northeast3.run.app
DIRECTUS_TOKEN=<대상 read + scraping_seen read/write 권한 static 토큰>
SLACK_SUPPORT_CHANNEL_ID=<없으면 SLACK_CHANNEL_ID로 폴백>
# (선택) TARGET_COLLECTION/TARGET_*_FIELD/SEEN_COLLECTION 으로 override
```

### 로컬 실행

```bash
npm install
npx playwright install --with-deps chromium
npm run send:support:dry-run   # 스크래핑 + 매칭 결과만 출력(미전송, 미기록)
npm run send:support           # 실제 전송 + 기록
```

### 자동 실행

- 워크플로: [`post-support-notify.yml`](/Users/beomsu/workspace/company/slack-bot/.github/workflows/post-support-notify.yml) — `cron: '0 0 * * *'`(UTC) = 09:00 KST + 수동 실행.
- repo secrets: `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_SUPPORT_CHANNEL_ID`(또는 `SLACK_CHANNEL_ID`).
- `scraping_seen` 컬렉션은 cms 레포 `apply-schema.mjs`로 멱등 생성됩니다.
- 메시지 형식을 바꾸려면 [`support-notify-builder.js`](/Users/beomsu/workspace/company/slack-bot/src/support-notify-builder.js)를 수정합니다.

### 한계

- 링크 텍스트 기반 키워드 매칭이라 제목이 링크 텍스트가 아닌 특이 구조 사이트는 놓칠 수 있습니다(대상별 셀렉터는 추후 확장).
- GitHub 러너 IP가 해외라 일부 정부 사이트가 차단할 수 있습니다. 차단 시 GCP Cloud Run Job 전환 검토.
