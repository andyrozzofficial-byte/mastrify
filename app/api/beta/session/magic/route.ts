import { NextResponse } from "next/server"
import { safeAccessRedirect } from "../../../../../lib/access"
import { normalizeBetaEmail } from "../../../../../lib/betaAccess"
import { sendBetaMagicLinkEmail } from "../../../../../lib/betaMagicLinkEmail"
import { createBetaMagicLinkToken, resolveAppOrigin } from "../../../../../lib/betaSession"
import { getBetaProfileStatus } from "../../../../../lib/betaUserData"

export async function POST(request: Request) {
  let body: { email?: string; next?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim() : ""
  if (!rawEmail.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 })
  }

  const normalized = normalizeBetaEmail(rawEmail)
  const status = await getBetaProfileStatus(normalized)
  if (!status.complete && !status.profile) {
    return NextResponse.json({
      ok: false,
      profileExists: false,
      error: "No beta profile found for this email.",
    })
  }

  const next = safeAccessRedirect(typeof body.next === "string" ? body.next : null)
  const token = await createBetaMagicLinkToken(normalized, next)
  if (!token) {
    return NextResponse.json({ error: "Could not create sign-in link." }, { status: 500 })
  }

  const origin = resolveAppOrigin(request)
  const signInUrl = `${origin}/api/beta/session/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`
  const emailResult = await sendBetaMagicLinkEmail({ email: normalized, signInUrl })

  if (!emailResult.sent) {
    const devHint =
      process.env.NODE_ENV !== "production"
        ? { devSignInUrl: signInUrl, reason: emailResult.reason }
        : {}
    return NextResponse.json(
      {
        ok: false,
        error:
          emailResult.reason === "resend_not_configured"
            ? "Email delivery is not configured. Contact support if this persists."
            : "Could not send sign-in email. Please try again.",
        ...devHint,
      },
      { status: 503 },
    )
  }

  return NextResponse.json({ ok: true, sent: true, email: normalized })
}
