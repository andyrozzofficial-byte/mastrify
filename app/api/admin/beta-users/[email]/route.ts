import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { fetchBetaUserProfile } from "../../../../../lib/betaUserData"

type Params = { params: Promise<{ email: string }> }

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/beta-users")
  if (auth.error) return auth.error

  const { email } = await params
  const profile = await fetchBetaUserProfile(decodeURIComponent(email))
  if ("error" in profile) {
    return NextResponse.json({ error: profile.error }, { status: 500 })
  }
  return NextResponse.json({ profile })
}
