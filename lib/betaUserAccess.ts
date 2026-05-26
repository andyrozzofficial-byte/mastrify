import { isValidBetaUserCookie, normalizeBetaEmail } from "./betaAccess"
import { hasMasteringAccess } from "./access"
import { getBetaProfileStatus } from "./betaUserData"

export type BetaUserAccessResult = {
  /** Cookie, profile row, or legacy access token — single source of truth for mastering gate. */
  isBetaUser: boolean
  hasMasteringAccess: boolean
  email: string | null
  profileExists: boolean
  profileComplete: boolean
}

function shouldLogBetaAccess(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.MASTRIFY_BETA_ACCESS_DEBUG === "1"
}

export function logBetaAccess(message: string, detail?: Record<string, unknown>) {
  if (!shouldLogBetaAccess()) return
  if (detail) console.log(`[beta-access] ${message}`, detail)
  else console.log(`[beta-access] ${message}`)
}

/**
 * Resolve beta mastering access from cookie, optional explicit email (resume), and DB profile.
 */
export async function resolveBetaUserAccess(
  accessCookie: string | undefined,
  betaEmailCookie: string | undefined,
  explicitEmail?: string | null,
): Promise<BetaUserAccessResult> {
  const cookieFound = isValidBetaUserCookie(betaEmailCookie)
  const emailFromCookie = cookieFound ? normalizeBetaEmail(betaEmailCookie!) : null
  const emailFromExplicit =
    typeof explicitEmail === "string" && explicitEmail.includes("@")
      ? normalizeBetaEmail(explicitEmail)
      : null
  const lookupEmail = emailFromCookie ?? emailFromExplicit

  if (cookieFound) {
    logBetaAccess("beta cookie found", { email: emailFromCookie })
  }

  let profileExists = false
  let profileComplete = false

  if (lookupEmail) {
    const status = await getBetaProfileStatus(lookupEmail)
    profileExists = Boolean(status.profile)
    profileComplete = status.profileDetailsComplete
    if (profileExists) {
      logBetaAccess("profile found", {
        email: lookupEmail,
        onboardingComplete: status.complete,
        profileDetailsComplete: status.profileDetailsComplete,
      })
    }
  }

  const legacyAccess = await hasMasteringAccess(
    accessCookie,
    cookieFound ? betaEmailCookie : undefined,
  )

  const isBetaUser = cookieFound || profileExists || legacyAccess

  if (isBetaUser) {
    logBetaAccess("beta access granted", {
      email: lookupEmail,
      cookieFound,
      profileExists,
      legacyAccess,
    })
  }

  return {
    isBetaUser,
    hasMasteringAccess: isBetaUser,
    email: lookupEmail,
    profileExists,
    profileComplete,
  }
}
