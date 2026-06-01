/** Global Supabase query timing + in-memory IO stats for admin performance reports. */

export type DbQueryRecord = {
  label: string
  caller: string
  durationMs: number
  rowEstimate: number | null
  at: number
  route: string | null
}

export type RouteDbStats = {
  route: string
  requestCount: number
  totalDbMs: number
  queryCount: number
  lastAt: number
}

const MAX_QUERY_LOG = 800
const queryLog: DbQueryRecord[] = []
const routeStats = new Map<string, RouteDbStats>()
const cacheStats = { hits: 0, misses: 0 }

let activeRoute: string | null = null
let activeRouteQueryCount = 0
let activeRouteDbMs = 0

export function beginDbRoute(route: string): void {
  activeRoute = route
  activeRouteQueryCount = 0
  activeRouteDbMs = 0
}

export function endDbRoute(): { route: string; queryCount: number; dbMs: number; durationMs: number } | null {
  if (!activeRoute) return null
  const route = activeRoute
  const queryCount = activeRouteQueryCount
  const dbMs = activeRouteDbMs
  activeRoute = null

  const prev = routeStats.get(route)
  routeStats.set(route, {
    route,
    requestCount: (prev?.requestCount ?? 0) + 1,
    totalDbMs: (prev?.totalDbMs ?? 0) + dbMs,
    queryCount: (prev?.queryCount ?? 0) + queryCount,
    lastAt: Date.now(),
  })

  return { route, queryCount, dbMs, durationMs: dbMs }
}

export function recordCacheHit(): void {
  cacheStats.hits += 1
}

export function recordCacheMiss(): void {
  cacheStats.misses += 1
}

function estimateRows<T>(result: T): number | null {
  if (result == null) return null
  if (Array.isArray(result)) return result.length
  if (typeof result === "object") {
    const r = result as Record<string, unknown>
    if (Array.isArray(r.data)) return r.data.length
    if (typeof r.count === "number") return r.count
  }
  return null
}

function logQuery(record: DbQueryRecord): void {
  queryLog.push(record)
  if (queryLog.length > MAX_QUERY_LOG) queryLog.splice(0, queryLog.length - MAX_QUERY_LOG)

  if (activeRoute) {
    activeRouteQueryCount += 1
    activeRouteDbMs += record.durationMs
  }

  const msg = `[db] ${record.label} ${record.durationMs}ms${record.rowEstimate != null ? ` (~${record.rowEstimate} rows)` : ""}${record.route ? ` route=${record.route}` : ""}`

  if (record.durationMs > 1000) {
    console.error(`${msg} SLOW`)
  } else if (record.durationMs > 200) {
    console.warn(msg)
  } else if (
    process.env.NODE_ENV === "development" ||
    process.env.MASTRIFY_PERF === "1" ||
    process.env.MASTRIFY_DB_LOG === "1"
  ) {
    console.log(msg)
  }
}

export async function supabaseTimed<T>(
  label: string,
  fn: () => Promise<T>,
  opts?: { caller?: string; rowEstimate?: number },
): Promise<T> {
  const start = Date.now()
  const caller = opts?.caller ?? label
  try {
    const result = await fn()
    const durationMs = Date.now() - start
    logQuery({
      label,
      caller,
      durationMs,
      rowEstimate: opts?.rowEstimate ?? estimateRows(result),
      at: Date.now(),
      route: activeRoute,
    })
    return result
  } catch (err) {
    const durationMs = Date.now() - start
    logQuery({
      label,
      caller,
      durationMs,
      rowEstimate: opts?.rowEstimate ?? null,
      at: Date.now(),
      route: activeRoute,
    })
    throw err
  }
}

export function getDbPerfReport() {
  const slowest = [...queryLog].sort((a, b) => b.durationMs - a.durationMs).slice(0, 25)
  const byLabel = new Map<string, { count: number; totalMs: number; maxMs: number }>()
  for (const q of queryLog) {
    const cur = byLabel.get(q.label) ?? { count: 0, totalMs: 0, maxMs: 0 }
    cur.count += 1
    cur.totalMs += q.durationMs
    cur.maxMs = Math.max(cur.maxMs, q.durationMs)
    byLabel.set(q.label, cur)
  }
  const topQueries = [...byLabel.entries()]
    .map(([label, s]) => ({
      label,
      count: s.count,
      avgMs: Math.round(s.totalMs / s.count),
      maxMs: s.maxMs,
      totalMs: s.totalMs,
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 20)

  const topRoutes = [...routeStats.values()]
    .map((r) => ({
      route: r.route,
      requestCount: r.requestCount,
      avgDbMs: r.requestCount > 0 ? Math.round(r.totalDbMs / r.requestCount) : 0,
      avgQueries: r.requestCount > 0 ? Math.round(r.queryCount / r.requestCount) : 0,
      totalDbMs: r.totalDbMs,
    }))
    .sort((a, b) => b.totalDbMs - a.totalDbMs)
    .slice(0, 20)

  const totalQueries = queryLog.length
  const totalDbMs = queryLog.reduce((s, q) => s + q.durationMs, 0)

  return {
    summary: {
      totalQueries,
      avgDbMs: totalQueries > 0 ? Math.round(totalDbMs / totalQueries) : 0,
      queriesOver200ms: queryLog.filter((q) => q.durationMs > 200).length,
      queriesOver1000ms: queryLog.filter((q) => q.durationMs > 1000).length,
      cacheHitRate:
        cacheStats.hits + cacheStats.misses > 0
          ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 1000) / 10
          : null,
    },
    slowestQueries: slowest,
    topQueriesByTotalTime: topQueries,
    topRoutesByDbTime: topRoutes,
    cache: { ...cacheStats },
  }
}

export function resetDbPerfReport(): void {
  queryLog.length = 0
  routeStats.clear()
  cacheStats.hits = 0
  cacheStats.misses = 0
}
