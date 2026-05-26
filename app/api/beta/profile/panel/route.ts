import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { buildBetaProfilePanelData } from "../../../../../lib/betaProfilePanel"
import { resolveBetaEmailFromCookies } from "../../../../../lib/betaSession"
import { fetchBetaUserProfile } from "../../../../../lib/betaUserData"

export async function GET() {
  const store = await cookies()
  const email = await resolveBetaEmailFromCookies(store)
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const profile = await fetchBetaUserProfile(email)
  if ("error" in profile) {
    return NextResponse.json({ error: profile.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, panel: buildBetaProfilePanelData(profile) })
}
