import type { BetaProfilePanelData } from "./betaProfilePanel"
import { recordCacheHit, recordCacheMiss } from "./supabaseTimed"

const CACHE_TTL_MS = 45_000

type Entry = { panel: BetaProfilePanelData; at: number }

const cache = new Map<string, Entry>()

export function getCachedBetaPanelCoreServer(email: string): BetaProfilePanelData | null {
  const key = email.trim().toLowerCase()
  const entry = cache.get(key)
  if (!entry) {
    recordCacheMiss()
    return null
  }
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key)
    recordCacheMiss()
    return null
  }
  recordCacheHit()
  return entry.panel
}

export function setCachedBetaPanelCoreServer(email: string, panel: BetaProfilePanelData): void {
  cache.set(email.trim().toLowerCase(), { panel, at: Date.now() })
}

export function invalidateBetaPanelCoreServerCache(email?: string): void {
  if (!email) {
    cache.clear()
    return
  }
  cache.delete(email.trim().toLowerCase())
}
