import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminBadges } from "../../../../lib/adminData"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/badges")
  if (auth.error) return auth.error

  const badges = await fetchAdminBadges()
  if ("error" in badges) {
    return NextResponse.json({ error: badges.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, badges })
}
