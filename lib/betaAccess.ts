export const BETA_USER_EMAIL_COOKIE = "mastrify_beta_email"

export const BETA_USER_RANKS = ["insider", "pioneer", "founding"] as const
export type BetaUserRank = (typeof BETA_USER_RANKS)[number]

export const BETA_DAW_OPTIONS = [
  "Ableton Live",
  "FL Studio",
  "Logic Pro",
  "Pro Tools",
  "Studio One",
  "Reaper",
  "Cubase",
  "Other",
] as const

export function normalizeBetaEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidBetaUserCookie(value: string | undefined): boolean {
  const email = value?.trim()
  return Boolean(email && email.includes("@"))
}

export function isBetaUserRank(v: string): v is BetaUserRank {
  return (BETA_USER_RANKS as readonly string[]).includes(v)
}

export function betaRankLabel(rank: string | null | undefined): string {
  if (!rank) return "Insider"
  return rank.charAt(0).toUpperCase() + rank.slice(1)
}

export const BETA_EMAIL_COOKIE_MAX_AGE = 60 * 60 * 24 * 400

export function betaEmailCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: BETA_EMAIL_COOKIE_MAX_AGE,
  }
}
