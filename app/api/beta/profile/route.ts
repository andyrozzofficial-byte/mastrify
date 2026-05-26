import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../lib/betaAccess"
import { findBetaProfileByEmail } from "../../../../lib/betaProfileDb"
import { resolveBetaEmailFromCookies } from "../../../../lib/betaSession"
import { ACCESS_COOKIE_NAME } from "../../../../lib/access"
import { betaProfileToJson, setBetaEmailCookieOnResponse } from "../../../../lib/betaProfileResponse"
import { resolveBetaUserAccess } from "../../../../lib/betaUserAccess"
import {
  getBetaMasteringUiStateForEmail,
  getBetaProfileStatus,
  registerBetaOnboarding,
} from "../../../../lib/betaUserData"
import { getSupabaseEnvStatus } from "../../../../lib/supabaseServer"

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

function apiError(
  status: number,
  message: string,
  debug?: { error?: string; stack?: string; supabase?: ReturnType<typeof getSupabaseEnvStatus> },
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(debug?.error ? { debugError: debug.error } : {}),
      ...(debug?.stack && process.env.NODE_ENV !== "production" ? { debugStack: debug.stack } : {}),
      ...(debug?.supabase && process.env.NODE_ENV !== "production" ? { supabase: debug.supabase } : {}),
    },
    { status },
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
  let body: { email?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return apiError(400, "Invalid JSON")
  }

  console.log("[beta-api] request body:", body)
  console.log("[beta-api] email:", body.email)

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!email) {
    return apiError(400, "Email required")
  }

  const normalized = normalizeBetaEmail(email)
  if (!normalized.includes("@")) {
    return apiError(400, "Valid email required")
  }

  try {
    const existing = await findBetaProfileByEmail(normalized)
    console.log("[beta-api] existing:", existing)

    if (existing?.email) {
      console.log("[beta-api] profile exists")
    }

    const profileData = {
      email: normalized,
      name: name || "",
      beta_rank: "explorer",
      beta_signed_up_at: new Date().toISOString(),
    }
    console.log("[beta-api] creating:", profileData)

    const result = await registerBetaOnboarding({ email: normalized, name: name || null })
    if ("error" in result) {
      throw new Error(result.error)
    }

    console.log("[beta-api] success:", result)

    const status = await getBetaProfileStatus(normalized)
    let betaUi = null
    try {
      betaUi = await getBetaMasteringUiStateForEmail(normalized)
    } catch (uiErr) {
      console.error("[beta-api] betaUi load failed (non-fatal):", uiErr)
    }

    const response = NextResponse.json({
      ok: true,
      success: true,
      email: normalized,
      complete: true,
      profileExists: Boolean(existing?.email) || result.existing,
      isBeta: true,
      isBetaUser: true,
      hasMasteringAccess: true,
      profile: status.profile ? betaProfileToJson(status.profile) : null,
      betaUi,
    })
    await setBetaEmailCookieOnResponse(response, normalized)
    return response
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error("[beta-api] FULL ERROR:", err)
    return apiError(500, "We couldn't create your profile right now. Please try again.", {
      error: err.message,
      stack: err.stack,
      supabase: getSupabaseEnvStatus(),
    })
  }
}
