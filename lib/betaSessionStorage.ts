import { normalizeBetaEmail } from "./betaAccess"

/** Client-side fallback when the httpOnly beta cookie is missing (e.g. cleared cookies). */
export const BETA_ACCESS_EMAIL_STORAGE_KEY = "mastrify_beta_email"

export function getStoredBetaEmail(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(BETA_ACCESS_EMAIL_STORAGE_KEY)
    if (!raw?.includes("@")) return null
    return normalizeBetaEmail(raw)
  } catch {
    return null
  }
}

export function setStoredBetaEmail(email: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(BETA_ACCESS_EMAIL_STORAGE_KEY, normalizeBetaEmail(email))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredBetaEmail(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(BETA_ACCESS_EMAIL_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
