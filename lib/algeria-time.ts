const TIME_ZONE = 'Africa/Algiers'

const weekdayNames: Record<string, string> = {
  Sun: 'الأحد',
  Mon: 'الاثنين',
  Tue: 'الثلاثاء',
  Wed: 'الأربعاء',
  Thu: 'الخميس',
  Fri: 'الجمعة',
  Sat: 'السبت',
}

export type AlgeriaNow = {
  date: string
  dayOfWeek: string
  minutesSinceMidnight: number
  hour: number
  minute: number
}

export function getAlgeriaNow(date = new Date()): AlgeriaNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  const hour = Number(get('hour'))
  const minute = Number(get('minute'))
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const weekday = get('weekday')

  return {
    date: `${year}-${month}-${day}`,
    dayOfWeek: weekdayNames[weekday] ?? weekday,
    minutesSinceMidnight: hour * 60 + minute,
    hour,
    minute,
  }
}

export { TIME_ZONE }
