import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../lib/betaAccess"
import { resolveBetaEmailFromCookies } from "../../../../lib/betaSession"
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
  const cookieEmail = await resolveBetaEmailFromCookies(store)
  const accessCookie = store.get(ACCESS_COOKIE_NAME)?.value
  const access = await resolveBetaUserAccess(accessCookie, cookieEmail)

  if (!cookieEmail && !access.email) {
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

  const normalized = access.email ?? cookieEmail!
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
  console.log("[beta] create profile start")

  let body: { email?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email : ""
  const name = typeof body.name === "string" ? body.name : null
  console.log("[beta] payload:", { email, name: name?.trim() || "" })

  if (!email.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    const result = await registerBetaOnboarding({ email, name })

    if ("error" in result) {
      console.error("[beta] create profile failed:", result.error)
      return NextResponse.json(
        { error: "We couldn't create your profile right now. Please try again." },
        { status: 500 },
      )
    }

    console.log("[beta] create profile success", { existing: result.existing })

    const normalized = normalizeBetaEmail(email)
    const status = await getBetaProfileStatus(normalized)
    const betaUi = await getBetaMasteringUiStateForEmail(normalized)
    const response = NextResponse.json({
      ok: true,
      email: normalized,
      complete: true,
      profileExists: result.existing,
      isBeta: true,
      isBetaUser: true,
      hasMasteringAccess: true,
      profile: status.profile ? betaProfileToJson(status.profile) : null,
      betaUi,
    })
    await setBetaEmailCookieOnResponse(response, normalized)
    return response
  } catch (err) {
    console.error("[beta] create profile failed:", err)
    return NextResponse.json(
      { error: "We couldn't create your profile right now. Please try again." },
      { status: 500 },
    )
  }
}
