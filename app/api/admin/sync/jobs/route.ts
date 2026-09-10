import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { syncJobsFromFeedbackForAdmin } from "../../../../../lib/adminData"
import { invalidateAdminOverviewCache } from "../../../../../lib/adminOverviewCache"

export async function POST() {
  const auth = await requireAdminApi("/api/admin/sync/jobs")
  if (auth.error) return auth.error

  const result = await syncJobsFromFeedbackForAdmin()
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  invalidateAdminOverviewCache()
  return NextResponse.json({ ok: true, synced: result.synced })
}
