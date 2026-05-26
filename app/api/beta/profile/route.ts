import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { BETA_USER_EMAIL_COOKIE, normalizeBetaEmail } from "../../../../lib/betaAccess"
import { ACCESS_COOKIE_NAME } from "../../../../lib/access"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../lib/betaProfileResponse"
import { resolveBetaUserAccess } from "../../../../lib/betaUserAccess"
import {
  getBetaMasteringUiStateForEmail,
  getBetaProfileStatus,
  registerBetaOnboarding,
} from "../../../../lib/betaUserData"

function resolveIsBeta(
  access: Awaited<ReturnType<typeof resolveBetaUserAccess>>,
  status: Awaited<ReturnType<typeof getBetaProfileStatus>> | null,
): boolean {
  return Boolean(
    access.isBetaUser ||
      access.profileExists ||
      status?.complete ||
      status?.profile,
  )
}

export async function GET() {
  const store = await cookies()
  const email = store.get(BETA_USER_EMAIL_COOKIE)?.value?.trim()
  const accessCookie = store.get(ACCESS_COOKIE_NAME)?.value
  const access = await resolveBetaUserAccess(accessCookie, email)

  if (!email && !access.email) {
    const isBeta = access.isBetaUser
    return NextResponse.json({
      complete: false,
      email: null,
      isBeta,
      isBetaUser: isBeta,
      hasMasteringAccess: access.hasMasteringAccess,
      profileExists: access.profileExists,
      betaUi: null,
    })
  }

  const normalized = access.email ?? normalizeBetaEmail(email!)
  const status = await getBetaProfileStatus(normalized)
  const isBeta = resolveIsBeta(access, status)
  const betaUi = isBeta ? await getBetaMasteringUiStateForEmail(normalized) : null

  return NextResponse.json({
    complete: status.complete,
    profileDetailsComplete: status.profileDetailsComplete,
    isBeta,
    isBetaUser: isBeta,
    hasMasteringAccess: isBeta || access.hasMasteringAccess,
    profileExists: access.profileExists || Boolean(status.profile),
    email: normalized,
    profile: status.profile ? betaProfileToJson(status.profile) : null,
    betaUi,
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
  const betaUi = await getBetaMasteringUiStateForEmail(normalized)
  const response = NextResponse.json({
    ok: true,
    email: normalized,
    complete: true,
    isBeta: true,
    isBetaUser: true,
    hasMasteringAccess: true,
    betaUi,
  })
  setBetaEmailCookieOnResponse(response, normalized)
  return response
}
