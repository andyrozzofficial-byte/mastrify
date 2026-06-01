import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { buildAdminFeedbackAnalytics } from "../../../../lib/adminFeedbackAnalytics"
import {
  buildAdminActionCenter,
  buildRankedFeedbackIssues,
} from "../../../../lib/adminFeedbackActionCenter"
import { buildAdminFeedbackInsights } from "../../../../lib/adminFeedbackInsights"
import {
  ADMIN_FEEDBACK_LIST_LIMIT,
  fetchAdminFeedback,
  updateFeedbackItem,
} from "../../../../lib/adminData"
import { parseAdminPage, ADMIN_PAGE_SIZE, buildAdminPaginationMeta } from "../../../../lib/adminPagination"
import { isAdminFeedbackStatus } from "../../../../lib/adminTypes"
import { invalidateAdminOverviewCache } from "../../../../lib/adminOverviewCache"

export async function GET(request: Request) {
  const auth = await requireAdminApi("/api/admin/feedback")
  if (auth.error) return auth.error

  const page = parseAdminPage(new URL(request.url).searchParams)
  const analyticsRows = await fetchAdminFeedback()

  if ("error" in analyticsRows) {
    return NextResponse.json({ error: analyticsRows.error }, { status: 500 })
  }

  const total = analyticsRows.length
  const from = (page - 1) * ADMIN_PAGE_SIZE
  const rows = analyticsRows.slice(from, from + ADMIN_PAGE_SIZE)

  return NextResponse.json({
    rows,
    pagination: buildAdminPaginationMeta(Math.min(total, ADMIN_FEEDBACK_LIST_LIMIT), page),
    analytics: buildAdminFeedbackAnalytics(analyticsRows),
    insights: buildAdminFeedbackInsights(analyticsRows),
    actionCenter: buildAdminActionCenter(analyticsRows),
    issueTiers: buildRankedFeedbackIssues(analyticsRows),
  })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi("/api/admin/feedback")
  if (auth.error) return auth.error

  let body: { id?: string; status?: string; admin_notes?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  if (body.status && !isAdminFeedbackStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const result = await updateFeedbackItem(body.id, {
    status: body.status,
    admin_notes: body.admin_notes,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  invalidateAdminOverviewCache()
  return NextResponse.json({ ok: true })
}
