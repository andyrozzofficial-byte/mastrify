import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  ACCESS_COOKIE_NAME,
  getAccessSecret,
  isAccessGateEnabled,
  verifyAccessToken,
} from "../../../../lib/access"
import { BETA_DAW_OPTIONS, BETA_USER_EMAIL_COOKIE, normalizeBetaEmail } from "../../../../lib/betaAccess"
import { BETA_FEEDBACK_GENRE_OPTIONS } from "../../../../lib/betaFeedbackTypes"
import {
  getBetaProfileStatus,
  upsertBetaProfile,
} from "../../../../lib/betaUserData"
async function hasBetaAccess(): Promise<boolean> {
  if (!isAccessGateEnabled()) return true
  const store = await cookies()
  return verifyAccessToken(store.get(ACCESS_COOKIE_NAME)?.value, getAccessSecret())
}

export async function GET() {
  if (!(await hasBetaAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const store = await cookies()
  const email = store.get(BETA_USER_EMAIL_COOKIE)?.value?.trim()
  if (!email) {
    return NextResponse.json({ complete: false, email: null })
  }

  const normalized = normalizeBetaEmail(email)
  const status = await getBetaProfileStatus(normalized)
  return NextResponse.json({
    complete: status.complete,
    email: normalized,
    profile: status.profile
      ? {
          name: status.profile.name,
          genre: status.profile.genre,
          daw: status.profile.daw,
          betaRank: status.profile.beta_rank,
          signupDate: status.profile.beta_signed_up_at,
        }
      : null,
  })
}

export async function POST(request: Request) {
  if (!(await hasBetaAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { email?: string; name?: string; genre?: string; daw?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email : ""
  const genre = typeof body.genre === "string" ? body.genre : ""
  const daw = typeof body.daw === "string" ? body.daw : ""

  if (!email.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }
  if (!(BETA_FEEDBACK_GENRE_OPTIONS as readonly string[]).includes(genre)) {
    return NextResponse.json({ error: "Select a valid genre" }, { status: 400 })
  }
  if (!(BETA_DAW_OPTIONS as readonly string[]).includes(daw)) {
    return NextResponse.json({ error: "Select a valid DAW" }, { status: 400 })
  }

  const result = await upsertBetaProfile({
    email,
    name: typeof body.name === "string" ? body.name : null,
    genre,
    daw,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const normalized = normalizeBetaEmail(email)
  const response = NextResponse.json({ ok: true, email: normalized })
  response.cookies.set(BETA_USER_EMAIL_COOKIE, normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  })
  return response
}
