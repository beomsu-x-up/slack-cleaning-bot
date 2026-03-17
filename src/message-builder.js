const WEEKLY_ASSIGNMENTS = [
  { label: '매월 첫째 주', shortLabel: '첫째 주', members: ['이용수', '김한수'] },
  { label: '매월 둘째 주', shortLabel: '둘째 주', members: ['장호민', '정성연'] },
  { label: '매월 셋째 주', shortLabel: '셋째 주', members: ['김범수', '방세현'] },
  { label: '매월 넷째 주', shortLabel: '넷째 주', members: ['구현모', '진민혁', '(백승엽)'] },
  { label: '매월 다섯째 주', shortLabel: '다섯째 주', members: ['백승엽', '이용수'] }
];

function getDatePartsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function getWeekIndexOfMonth(dayOfMonth) {
  return Math.ceil(dayOfMonth / 7) - 1;
}

function formatBroadcastPrefix(broadcast) {
  if (broadcast === 'channel') {
    return '<!channel> ';
  }

  if (broadcast === 'here') {
    return '<!here> ';
  }

  return '';
}

function buildScheduleLines(activeWeekIndex) {
  return WEEKLY_ASSIGNMENTS.map((assignment, index) => {
    const prefix = index === activeWeekIndex ? '👉' : '▫️';
    return `${prefix} *${assignment.shortLabel}*  ${assignment.members.join(', ')}`;
  }).join('\n');
}

export function buildWeeklyDutyPayload({
  date = new Date(),
  timeZone = 'Asia/Seoul',
  broadcast = '',
  highlightEmoji = ':sparkles:'
} = {}) {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  const weekIndex = getWeekIndexOfMonth(day);
  const currentAssignment = WEEKLY_ASSIGNMENTS[weekIndex] ?? WEEKLY_ASSIGNMENTS.at(-1);
  const monthLabel = `${year}년 ${month}월`;
  const lead = formatBroadcastPrefix(broadcast);
  const headline = `${monthLabel} ${currentAssignment.shortLabel} 담당 안내`;
  const text = [
    `${lead}${headline}`,
    `${currentAssignment.label} | ${currentAssignment.members.join(', ')}`,
    '',
    WEEKLY_ASSIGNMENTS.map((assignment) => `${assignment.label} | ${assignment.members.join(', ')}`).join('\n')
  ].join('\n');

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: headline,
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${lead}*이번 주 담당*\n${highlightEmoji} *${currentAssignment.members.join(' · ')}*`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `월요일 자동 안내 · ${currentAssignment.label}`
        }
      ]
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*월별 전체 일정*\n${buildScheduleLines(weekIndex)}`
      }
    }
  ];

  return {
    text,
    blocks,
    meta: {
      monthLabel,
      weekIndex,
      currentAssignment
    }
  };
}

export { WEEKLY_ASSIGNMENTS, getWeekIndexOfMonth };
