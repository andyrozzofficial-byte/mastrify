import type { NextResponse } from "next/server"
import { betaEmailCookieOptions, BETA_USER_EMAIL_COOKIE, normalizeBetaEmail } from "./betaAccess"
import { BETA_SESSION_COOKIE, createBetaSessionToken } from "./betaSession"

type BetaProfileShape = {
  name: string | null
  genre: string | null
  daw: string | null
  beta_rank: string | null
  beta_signed_up_at: string | null
}

export function betaProfileToJson(profile: BetaProfileShape) {
  return {
    name: profile.name,
    genre: profile.genre,
    daw: profile.daw,
    betaRank: profile.beta_rank,
    signupDate: profile.beta_signed_up_at,
  }
}

export async function setBetaEmailCookieOnResponse(response: NextResponse, email: string) {
  const normalized = normalizeBetaEmail(email)
  const options = betaEmailCookieOptions()
  response.cookies.set(BETA_USER_EMAIL_COOKIE, normalized, options)
  const sessionToken = await createBetaSessionToken(normalized)
  if (sessionToken) {
    response.cookies.set(BETA_SESSION_COOKIE, sessionToken, options)
  }
}
