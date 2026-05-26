import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { BETA_USER_EMAIL_COOKIE, normalizeBetaEmail } from "../../../../lib/betaAccess"
import { ACCESS_COOKIE_NAME } from "../../../../lib/access"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../lib/betaProfileResponse"
import { resolveBetaUserAccess } from "../../../../lib/betaUserAccess"
import { getBetaProfileStatus, registerBetaOnboarding } from "../../../../lib/betaUserData"

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
    profileDetailsComplete: status.profileDetailsComplete,
    isBetaUser: access.isBetaUser,
    hasMasteringAccess: access.hasMasteringAccess,
    profileExists: access.profileExists,
    email: normalized,
    profile: status.profile ? betaProfileToJson(status.profile) : null,
  })
}

export async function POST(request: Request) {
  let body: { email?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email : ""

  if (!email.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const result = await registerBetaOnboarding({
    email,
    name: typeof body.name === "string" ? body.name : null,
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
