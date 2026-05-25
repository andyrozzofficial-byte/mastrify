export const BETA_FEEDBACK_STORAGE_KEY = "mastrify_beta_feedback_v1"

export type BetaFeedbackStorageStatus = "skipped" | "submitted"

export function readBetaFeedbackStatus(): BetaFeedbackStorageStatus | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(BETA_FEEDBACK_STORAGE_KEY)
    if (raw === "skipped" || raw === "submitted") return raw
    return null
  } catch {
    return null
  }
}

export function writeBetaFeedbackStatus(status: BetaFeedbackStorageStatus) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(BETA_FEEDBACK_STORAGE_KEY, status)
  } catch {
    /* ignore */
  }
}

/** Dev / QA only — call from console: `localStorage.removeItem('mastrify_beta_feedback_v1')` */
export function clearBetaFeedbackStatusForTesting() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(BETA_FEEDBACK_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
