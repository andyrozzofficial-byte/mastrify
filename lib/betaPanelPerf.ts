/** Server-side per-query timing for beta profile panel loads. */

import { PERF_DEBUG } from "./perfDebug"

export const BETA_PANEL_PERF =
  PERF_DEBUG || process.env.NODE_ENV === "development" || process.env.MASTRIFY_PANEL_PERF === "1"

export async function panelTimedAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!BETA_PANEL_PERF) return fn()
  const key = `beta-panel: ${label}`
  console.time(key)
  try {
    return await fn()
  } finally {
    console.timeEnd(key)
  }
}

export function panelTimedSync<T>(label: string, fn: () => T): T {
  if (!BETA_PANEL_PERF) return fn()
  const key = `beta-panel: ${label}`
  console.time(key)
  try {
    return fn()
  } finally {
    console.timeEnd(key)
  }
}
