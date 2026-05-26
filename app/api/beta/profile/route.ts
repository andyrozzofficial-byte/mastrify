import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { BETA_DAW_OPTIONS, BETA_USER_EMAIL_COOKIE, normalizeBetaEmail } from "../../../../lib/betaAccess"
import { ACCESS_COOKIE_NAME } from "../../../../lib/access"
import { BETA_FEEDBACK_GENRE_OPTIONS } from "../../../../lib/betaFeedbackTypes"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../lib/betaProfileResponse"
import { resolveBetaUserAccess } from "../../../../lib/betaUserAccess"
import { getBetaProfileStatus, upsertBetaProfile } from "../../../../lib/betaUserData"

export async function GET() {
  const store = await cookies()
  const email = store.get(BETA_USER_EMAIL_COOKIE)?.value?.trim()
  const accessCookie = store.get(ACCESS_COOKIE_NAME)?.value
  const access = await resolveBetaUserAccess(accessCookie, email)

  if (!email && !access.email) {
    return NextResponse.json({
      complete: false,
      email: null,
      isBetaUser: access.isBetaUser,
      hasMasteringAccess: access.hasMasteringAccess,
      profileExists: access.profileExists,
    })
  }

  const normalized = access.email ?? normalizeBetaEmail(email!)
  const status = await getBetaProfileStatus(normalized)
  return NextResponse.json({
    complete: status.complete,
    isBetaUser: access.isBetaUser,
    hasMasteringAccess: access.hasMasteringAccess,
    profileExists: access.profileExists,
    email: normalized,
    profile: status.profile ? betaProfileToJson(status.profile) : null,
  })
}

export async function POST(request: Request) {
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
  const response = NextResponse.json({
    ok: true,
    email: normalized,
    complete: true,
    isBetaUser: true,
    hasMasteringAccess: true,
  })
  setBetaEmailCookieOnResponse(response, normalized)
  return response
}
