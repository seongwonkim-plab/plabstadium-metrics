export function currentYearMonth(): { year: number; month: number } {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600_000)
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 }
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

export function monthsBack(
  year: number,
  month: number,
  count: number,
): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = []
  let y = year
  let m = month
  for (let i = 0; i < count; i++) {
    out.unshift({ year: y, month: m })
    const prev = previousMonth(y, m)
    y = prev.year
    m = prev.month
  }
  return out
}

export function monthOptions(count = 24): { year: number; month: number; label: string }[] {
  const now = currentYearMonth()
  const list = monthsBack(now.year, now.month, count)
  return list
    .reverse()
    .map((m) => ({ ...m, label: `${m.year}년 ${m.month}월` }))
}

function isoWeekMonday(d: Date): Date {
  const day = d.getUTCDay() || 7
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - (day - 1))
  return monday
}

export type Week = {
  year: number
  month: number
  weekOfMonth: number
  start: Date
  end: Date
  label: string
}

export function currentWeek(): Week {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600_000)
  return weekFor(kst)
}

export function weekFor(d: Date): Week {
  const monday = isoWeekMonday(d)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  // 사용자 정의: 그 주의 일요일(=주의 마지막 날)이 속한 달의 주차로 계산.
  // 예: 6/29(월)~7/5(일) → 일요일이 7월이므로 "7월 1주차".
  const y = sunday.getUTCFullYear()
  const m = sunday.getUTCMonth() + 1

  // 그 달의 1일이 속한 주의 월요일을 기준으로 계산 (1일 있는 주 = 1주차)
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1))
  const firstWeekMonday = isoWeekMonday(firstOfMonth)
  const week = Math.round((monday.getTime() - firstWeekMonday.getTime()) / (7 * 86400_000)) + 1

  return {
    year: y,
    month: m,
    weekOfMonth: week,
    start: monday,
    end: sunday,
    label: `${m}월 ${week}주차 · ${fmtMd(monday)}–${fmtMd(sunday)}`,
  }
}

function fmtMd(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export function weeksBack(from: Date, count: number): Week[] {
  const weeks: Week[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(from)
    d.setUTCDate(from.getUTCDate() - 7 * i)
    weeks.unshift(weekFor(d))
  }
  return weeks
}

export function weekKey(w: Week): string {
  return `${w.start.getUTCFullYear()}-${String(w.start.getUTCMonth() + 1).padStart(2, "0")}-${String(w.start.getUTCDate()).padStart(2, "0")}`
}

export function weekFromKey(key: string): Week | null {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return weekFor(date)
}

export function weekOptions(count = 12): Week[] {
  const cur = currentWeek()
  return weeksBack(cur.start, count)
}

// 데이터 시작 연도 (2020년부터 운영)
export const DATA_START_YEAR = 2020

export function yearOptions(): number[] {
  const now = currentYearMonth()
  const years: number[] = []
  for (let y = now.year; y >= DATA_START_YEAR; y--) years.push(y)
  return years
}

// 지정된 연도에 소속된 모든 주 (일요일 기준). 미래 주는 제외.
export function weeksInYear(year: number): Week[] {
  const first = new Date(Date.UTC(year, 0, 1))
  const firstMonday = isoWeekMonday(first)
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600_000)
  const currentMonday = isoWeekMonday(kst)
  const weeks: Week[] = []
  let d = new Date(firstMonday)
  while (true) {
    const w = weekFor(d)
    if (w.year > year) break
    if (w.year === year) weeks.push(w)
    d.setUTCDate(d.getUTCDate() + 7)
    if (d > currentMonday) break
    if (weeks.length > 60) break
  }
  return weeks
}
