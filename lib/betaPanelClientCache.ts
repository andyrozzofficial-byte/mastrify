import type { BetaProfilePanelData, BetaProfilePanelSecondary } from "./betaProfilePanel"
import { mergeBetaProfilePanelSecondary } from "./betaProfilePanel"

const CACHE_TTL_MS = 45_000

type CacheEntry = {
  core: BetaProfilePanelData
  secondary: BetaProfilePanelSecondary | null
  cachedAt: number
}

let cache: { email: string; entry: CacheEntry } | null = null

export function getCachedBetaPanel(email: string): BetaProfilePanelData | null {
  if (!cache || cache.email !== email.trim().toLowerCase()) return null
  if (Date.now() - cache.entry.cachedAt > CACHE_TTL_MS) {
    cache = null
    return null
  }
  const { core, secondary } = cache.entry
  return secondary ? mergeBetaProfilePanelSecondary(core, secondary) : core
}

export function getCachedBetaPanelCore(email: string): BetaProfilePanelData | null {
  if (!cache || cache.email !== email.trim().toLowerCase()) return null
  if (Date.now() - cache.entry.cachedAt > CACHE_TTL_MS) {
    cache = null
    return null
  }
  return cache.entry.core
}

export function setCachedBetaPanelCore(email: string, core: BetaProfilePanelData): void {
  const key = email.trim().toLowerCase()
  const existing = cache?.email === key ? cache.entry.secondary : null
  cache = { email: key, entry: { core, secondary: existing, cachedAt: Date.now() } }
}

export function setCachedBetaPanelSecondary(email: string, secondary: BetaProfilePanelSecondary): void {
  const key = email.trim().toLowerCase()
  if (!cache || cache.email !== key) return
  cache = {
    email: key,
    entry: { ...cache.entry, secondary, cachedAt: Date.now() },
  }
}

export function invalidateBetaPanelCache(): void {
  cache = null
}
