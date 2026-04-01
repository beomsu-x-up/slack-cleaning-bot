function formatBroadcastPrefix(broadcast) {
  if (broadcast === 'channel') {
    return '<!channel> ';
  }

  if (broadcast === 'here') {
    return '<!here> ';
  }

  return '';
}

export function buildPlantReminderPayload({
  broadcast = '',
  plantEmoji = ':seedling:',
  waterEmoji = ':droplet:'
} = {}) {
  const lead = formatBroadcastPrefix(broadcast);
  const title = '금요일 식물 물주기 알림';

  return {
    text: `${lead}${title}\n오늘은 식물에 물을 주는 날입니다.`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${lead}*오늘 할 일*\n${plantEmoji} ${waterEmoji} 식물에 물을 주세요.`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '매주 금요일 오전 9시 자동 안내'
          }
        ]
      }
    ]
  };
}
