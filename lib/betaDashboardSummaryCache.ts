import type { BetaDashboardSummary } from "./adminTypes"
import { recordCacheHit, recordCacheMiss } from "./supabaseTimed"

const CACHE_TTL_MS = 45_000

let cache: { summary: BetaDashboardSummary; at: number } | null = null

export function getCachedBetaDashboardSummary(): BetaDashboardSummary | null {
  if (!cache) {
    recordCacheMiss()
    return null
  }
  if (Date.now() - cache.at > CACHE_TTL_MS) {
    cache = null
    recordCacheMiss()
    return null
  }
  recordCacheHit()
  return cache.summary
}

export function setCachedBetaDashboardSummary(summary: BetaDashboardSummary): void {
  cache = { summary, at: Date.now() }
}

export function invalidateBetaDashboardSummaryCache(): void {
  cache = null
}
