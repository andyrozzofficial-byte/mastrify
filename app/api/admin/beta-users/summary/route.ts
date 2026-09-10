import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { fetchBetaDashboardSummary } from "../../../../../lib/betaUserData"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/beta-users")
  if (auth.error) return auth.error

  const summary = await fetchBetaDashboardSummary()
  if ("error" in summary) {
    console.error("[admin-api] beta-users/summary failed", summary.error)
    return NextResponse.json(
      {
        error: summary.error,
        summary: { mostActive: [], recentSignups: [], topFeedbackContributors: [], topIssueReporters: [] },
      },
      { status: 200 },
    )
  }
  return NextResponse.json({ summary })
}
