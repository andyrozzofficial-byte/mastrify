import type { AdminOverview } from "./adminTypes"
import { statsDebug } from "./statsDebug"
import { recordCacheHit, recordCacheMiss } from "./supabaseTimed"

const CACHE_TTL_MS = 45_000

type Entry = { data: AdminOverview; at: number }

let cache: Entry | null = null

export function getCachedAdminOverview(): AdminOverview | null {
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
  return cache.data
}

export function setCachedAdminOverview(data: AdminOverview): void {
  cache = { data, at: Date.now() }
}

export function invalidateAdminOverviewCache(reason?: string): void {
  const hadCache = Boolean(cache)
  cache = null
  statsDebug("admin overview cache invalidated", { hadCache, reason: reason ?? "unspecified" })
}
