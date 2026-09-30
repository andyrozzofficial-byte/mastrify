export const ANALYTICS_PERIODS = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "this_month",
  "last_month",
  "all_time",
] as const

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "7 days",
  "30d": "30 days",
  this_month: "This month",
  last_month: "Last month",
  all_time: "All time",
}

export type PeriodRange = {
  start: string | null
  end: string | null
  compareStart: string | null
  compareEnd: string | null
  compareLabel: string | null
  label: string
}

export type TimeSeriesGranularity = "hour" | "day" | "week"

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function iso(d: Date): string {
  return d.toISOString()
}

export function parseAnalyticsPeriod(raw: string | null | undefined): AnalyticsPeriod {
  const key = raw?.trim().toLowerCase()
  if (key && (ANALYTICS_PERIODS as readonly string[]).includes(key)) {
    return key as AnalyticsPeriod
  }
  return "30d"
}

/** Fixed calendar windows for the revenue summary cards (always shown). */
export function resolveRevenueSummaryRanges(now = new Date()) {
  const todayStart = startOfDay(now)
  const yesterdayStart = addDays(todayStart, -1)
  const yesterdayEnd = endOfDay(yesterdayStart)
  const thisMonthStart = startOfMonth(now)
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1)
  const lastMonthStart = startOfMonth(lastMonthEnd)

  return {
    today: { start: iso(todayStart), end: iso(now) },
    yesterday: { start: iso(yesterdayStart), end: iso(yesterdayEnd) },
    thisMonth: { start: iso(thisMonthStart), end: iso(now) },
    lastMonth: { start: iso(lastMonthStart), end: iso(lastMonthEnd) },
    allTime: { start: null as string | null, end: null as string | null },
  }
}

export function resolvePeriodRange(period: AnalyticsPeriod, now = new Date()): PeriodRange {
  const todayStart = startOfDay(now)

  switch (period) {
    case "today": {
      const yesterdayStart = addDays(todayStart, -1)
      const elapsed = now.getTime() - todayStart.getTime()
      const compareEnd = new Date(yesterdayStart.getTime() + elapsed)
      return {
        start: iso(todayStart),
        end: iso(now),
        compareStart: iso(yesterdayStart),
        compareEnd: iso(compareEnd),
        compareLabel: "yesterday (same time window)",
        label: ANALYTICS_PERIOD_LABELS.today,
      }
    }
    case "yesterday": {
      const yesterdayStart = addDays(todayStart, -1)
      const dayBeforeStart = addDays(yesterdayStart, -1)
      return {
        start: iso(yesterdayStart),
        end: iso(endOfDay(yesterdayStart)),
        compareStart: iso(dayBeforeStart),
        compareEnd: iso(endOfDay(dayBeforeStart)),
        compareLabel: "previous day",
        label: ANALYTICS_PERIOD_LABELS.yesterday,
      }
    }
    case "7d": {
      const start = addDays(todayStart, -6)
      const compareEnd = addDays(start, -1)
      const compareStart = addDays(compareEnd, -6)
      return {
        start: iso(start),
        end: iso(now),
        compareStart: iso(compareStart),
        compareEnd: iso(endOfDay(compareEnd)),
        compareLabel: "previous 7 days",
        label: ANALYTICS_PERIOD_LABELS["7d"],
      }
    }
    case "30d": {
      const start = addDays(todayStart, -29)
      const compareEnd = addDays(start, -1)
      const compareStart = addDays(compareEnd, -29)
      return {
        start: iso(start),
        end: iso(now),
        compareStart: iso(compareStart),
        compareEnd: iso(endOfDay(compareEnd)),
        compareLabel: "previous 30 days",
        label: ANALYTICS_PERIOD_LABELS["30d"],
      }
    }
    case "this_month": {
      const monthStart = startOfMonth(now)
      const lastMonthEnd = new Date(monthStart.getTime() - 1)
      const lastMonthStart = startOfMonth(lastMonthEnd)
      const dayOfMonth = now.getDate()
      const compareEnd = new Date(
        lastMonthStart.getFullYear(),
        lastMonthStart.getMonth(),
        Math.min(dayOfMonth, lastMonthEnd.getDate()),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      )
      return {
        start: iso(monthStart),
        end: iso(now),
        compareStart: iso(lastMonthStart),
        compareEnd: iso(compareEnd),
        compareLabel: "last month (same elapsed period)",
        label: ANALYTICS_PERIOD_LABELS.this_month,
      }
    }
    case "last_month": {
      const thisMonthStart = startOfMonth(now)
      const lastMonthEnd = new Date(thisMonthStart.getTime() - 1)
      const lastMonthStart = startOfMonth(lastMonthEnd)
      const prevMonthEnd = new Date(lastMonthStart.getTime() - 1)
      const prevMonthStart = startOfMonth(prevMonthEnd)
      return {
        start: iso(lastMonthStart),
        end: iso(lastMonthEnd),
        compareStart: iso(prevMonthStart),
        compareEnd: iso(prevMonthEnd),
        compareLabel: "previous month",
        label: ANALYTICS_PERIOD_LABELS.last_month,
      }
    }
    case "all_time":
    default:
      return {
        start: null,
        end: null,
        compareStart: null,
        compareEnd: null,
        compareLabel: null,
        label: ANALYTICS_PERIOD_LABELS.all_time,
      }
  }
}

export function resolveTimeSeriesGranularity(
  period: AnalyticsPeriod,
  spanDays: number,
): TimeSeriesGranularity {
  if (period === "today" || period === "yesterday") return "hour"
  if (period === "all_time" && spanDays > 120) return "week"
  return "day"
}

export function bucketKey(isoTimestamp: string, granularity: TimeSeriesGranularity): string {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return isoTimestamp.slice(0, 10)

  if (granularity === "hour") {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const h = String(d.getHours()).padStart(2, "0")
    return `${y}-${m}-${day} ${h}:00`
  }

  if (granularity === "week") {
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setUTCDate(diff)
    return monday.toISOString().slice(0, 10)
  }

  return isoTimestamp.slice(0, 10)
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0
    return null
  }
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function formatComparisonHint(
  current: number,
  previous: number | null,
  compareLabel: string | null,
  formatValue: (n: number) => string = String,
): string | undefined {
  if (previous == null || !compareLabel) return undefined

  if (previous === 0 && current === 0) return `Flat vs ${compareLabel}`
  if (previous === 0 && current > 0) return `New activity — no previous data vs ${compareLabel}`
  if (current === 0 && previous > 0) {
    return `Down from ${formatValue(previous)} vs ${compareLabel}`
  }

  const pct = pctChange(current, previous)
  if (pct === null) return `New activity vs ${compareLabel}`
  if (pct === 0) return `Flat vs ${compareLabel}`
  const arrow = pct > 0 ? "↑" : "↓"
  return `${arrow} ${Math.abs(pct)}% vs ${compareLabel}`
}

export function inRange(isoTimestamp: string, start: string | null, end: string | null): boolean {
  const t = new Date(isoTimestamp).getTime()
  if (Number.isNaN(t)) return false
  if (start && t < new Date(start).getTime()) return false
  if (end && t > new Date(end).getTime()) return false
  return true
}
