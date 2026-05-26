import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { buildAdminFeedbackAnalytics } from "../../../../lib/adminFeedbackAnalytics"
import {
  buildAdminActionCenter,
  buildRankedFeedbackIssues,
} from "../../../../lib/adminFeedbackActionCenter"
import { buildAdminFeedbackInsights } from "../../../../lib/adminFeedbackInsights"
import {
  fetchAdminFeedback,
  fetchAdminFeedbackPaginated,
  updateFeedbackItem,
} from "../../../../lib/adminData"
import { parseAdminPage } from "../../../../lib/adminPagination"
import { isAdminFeedbackStatus } from "../../../../lib/adminTypes"

export async function GET(request: Request) {
  const auth = await requireAdminApi("/api/admin/feedback")
  if (auth.error) return auth.error

  const page = parseAdminPage(new URL(request.url).searchParams)
  const [listed, analyticsRows] = await Promise.all([
    fetchAdminFeedbackPaginated(page),
    fetchAdminFeedback(),
  ])

  if ("error" in listed) {
    return NextResponse.json({ error: listed.error }, { status: 500 })
  }
  if ("error" in analyticsRows) {
    return NextResponse.json({ error: analyticsRows.error }, { status: 500 })
  }

  return NextResponse.json({
    rows: listed.rows,
    pagination: listed.pagination,
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
  return NextResponse.json({ ok: true })
}
