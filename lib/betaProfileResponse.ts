import type { NextResponse } from "next/server"
import { betaEmailCookieOptions, BETA_USER_EMAIL_COOKIE, normalizeBetaEmail } from "./betaAccess"

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

export function setBetaEmailCookieOnResponse(response: NextResponse, email: string) {
  response.cookies.set(BETA_USER_EMAIL_COOKIE, normalizeBetaEmail(email), betaEmailCookieOptions())
}
