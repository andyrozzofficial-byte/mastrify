import { NextResponse } from "next/server"
import { safeAccessRedirect } from "../../../../../lib/access"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../../lib/betaProfileResponse"
import { verifyBetaMagicLinkToken } from "../../../../../lib/betaSession"
import { buildBetaMasteringUiForEmailScoped, getBetaProfileStatus } from "../../../../../lib/betaUserData"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")?.trim()
  const next = safeAccessRedirect(url.searchParams.get("next"))

  const verified = await verifyBetaMagicLinkToken(token ?? undefined)
  if (!verified) {
    const fail = new URL("/access", url.origin)
    fail.searchParams.set("mode", "continue")
    fail.searchParams.set("error", "link_expired")
    if (next !== "/master") fail.searchParams.set("next", next)
    return NextResponse.redirect(fail)
  }

  const status = await getBetaProfileStatus(verified.email)
  if (!status.complete && !status.profile) {
    const fail = new URL("/access", url.origin)
    fail.searchParams.set("mode", "join")
    fail.searchParams.set("error", "no_profile")
    return NextResponse.redirect(fail)
  }

  const redirectTo = safeAccessRedirect(verified.next || next)
  const response = NextResponse.redirect(new URL(redirectTo, url.origin))
  await setBetaEmailCookieOnResponse(response, verified.email)
  return response
}

/** Optional JSON verify for client-side handling without redirect. */
export async function POST(request: Request) {
  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const verified = await verifyBetaMagicLinkToken(
    typeof body.token === "string" ? body.token : undefined,
  )
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 })
  }

  const status = await getBetaProfileStatus(verified.email)
  const isBeta = Boolean(status.complete || status.profile)
  if (!isBeta) {
    return NextResponse.json({ error: "No beta profile found" }, { status: 404 })
  }

  const betaUi = await buildBetaMasteringUiForEmailScoped(verified.email)
  const response = NextResponse.json({
    ok: true,
    email: verified.email,
    complete: status.complete,
    isBeta: true,
    isBetaUser: true,
    hasMasteringAccess: true,
    profileExists: Boolean(status.profile),
    profile: status.profile ? betaProfileToJson(status.profile) : null,
    betaUi,
    next: safeAccessRedirect(verified.next),
  })
  await setBetaEmailCookieOnResponse(response, verified.email)
  return response
}
