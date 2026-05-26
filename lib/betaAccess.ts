export const BETA_USER_EMAIL_COOKIE = "mastrify_beta_email"

export const BETA_USER_RANKS = ["explorer", "insider", "pioneer", "legend"] as const
export type BetaUserRank = (typeof BETA_USER_RANKS)[number]

/** Legacy DB values mapped on read (founding → legend). */
export const LEGACY_BETA_RANK_ALIASES: Record<string, BetaUserRank> = {
  founding: "legend",
}

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
  const key = v.toLowerCase()
  return (BETA_USER_RANKS as readonly string[]).includes(key) || key in LEGACY_BETA_RANK_ALIASES
}

export function migrateLegacyRank(rank: string | null | undefined): BetaUserRank {
  const r = rank?.toLowerCase()
  if (r && r in LEGACY_BETA_RANK_ALIASES) return LEGACY_BETA_RANK_ALIASES[r]!
  if (r && (BETA_USER_RANKS as readonly string[]).includes(r)) return r as BetaUserRank
  return "explorer"
}

export function betaRankLabel(rank: string | null | undefined): string {
  if (!rank) return "Explorer"
  const label = migrateLegacyRank(rank)
  return label.charAt(0).toUpperCase() + label.slice(1)
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
