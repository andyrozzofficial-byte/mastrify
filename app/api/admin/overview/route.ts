import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminOverview } from "../../../../lib/adminData"
import { beginDbRoute, endDbRoute } from "../../../../lib/supabaseTimed"

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  beginDbRoute("GET /api/admin/overview")
  const t0 = Date.now()
  const data = await fetchAdminOverview()
  const dbStats = endDbRoute()

  if (process.env.NODE_ENV === "development" || process.env.MASTRIFY_PERF === "1") {
    console.log(`[admin-api] overview ${Date.now() - t0}ms`, dbStats)
  }
  if ("error" in data) {
    console.error("[admin-api] overview failed", data.error, dbStats)
    // Never white-screen admin: return a safe partial payload.
    return NextResponse.json(
      {
        error: data.error,
        uploadsToday: 0,
        mastersCompletedToday: 0,
        paidDownloadsToday: 0,
        revenueToday: 0,
        conversionRate: null,
        activeUsers: 0,
        failedJobs: 0,
        feedbackTotal: 0,
        feedbackNew: 0,
        supportTotal: 0,
        supportOpen: 0,
        avgRecommendScore: null,
        badges: { feedback: 0, support: 0 },
        recentFeedback: [],
        recentSupport: [],
        recentMasters: [],
        recentPurchases: [],
        recentActivity: [],
        actionCenter: [],
      },
      { status: 200 },
    )
  }
  return NextResponse.json(data)
}
