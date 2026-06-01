import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { normalizeBetaEmail } from "../../../../../../lib/betaAccess"
import { resolveBetaEmailFromCookies } from "../../../../../../lib/betaSession"
import { fetchBetaProfilePanelSecondaryForEmail } from "../../../../../../lib/betaUserData"

async function resolvePanelEmail(
  cookieEmail: string | null,
  bodyEmail?: string,
): Promise<string | null> {
  if (cookieEmail) return cookieEmail
  const normalized = typeof bodyEmail === "string" ? normalizeBetaEmail(bodyEmail) : ""
  return normalized.includes("@") ? normalized : null
}

export async function POST(request: Request) {
  const store = await cookies()
  const cookieEmail = await resolveBetaEmailFromCookies(store)

  let bodyEmail: string | undefined
  try {
    const body = (await request.json()) as { email?: string }
    bodyEmail = body.email
  } catch {
    /* optional body */
  }

  const email = await resolvePanelEmail(cookieEmail, bodyEmail)
  if (!email) {
    return NextResponse.json({ error: "Beta email required" }, { status: 401 })
  }

  const result = await fetchBetaProfilePanelSecondaryForEmail(email)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, secondary: result.secondary })
}
