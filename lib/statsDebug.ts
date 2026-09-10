/** Master completion / admin KPI tracing — server-only. Set MASTRIFY_STATS_DEBUG=1. */
export const MASTRIFY_STATS_DEBUG =
  typeof window === "undefined" &&
  (process.env.MASTRIFY_STATS_DEBUG === "1" ||
    (process.env.NODE_ENV === "development" && process.env.MASTRIFY_PERF === "1"))

export function statsDebug(label: string, detail?: Record<string, unknown>): void {
  if (typeof window !== "undefined") return
  if (!MASTRIFY_STATS_DEBUG) return
  if (detail) console.log(`[mastrify-stats] ${label}`, detail)
  else console.log(`[mastrify-stats] ${label}`)
}
