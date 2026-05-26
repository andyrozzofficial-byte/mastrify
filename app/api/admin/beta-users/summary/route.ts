import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { fetchBetaDashboardSummary } from "../../../../../lib/betaUserData"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/beta-users")
  if (auth.error) return auth.error

  const summary = await fetchBetaDashboardSummary()
  if ("error" in summary) {
    return NextResponse.json({ error: summary.error }, { status: 500 })
  }
  return NextResponse.json({ summary })
}
