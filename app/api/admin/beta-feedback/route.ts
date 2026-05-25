import { NextResponse } from "next/server"
import { isBetaFeedbackEnabled } from "../../../../lib/betaFeedbackFeature"
import {
  buildBetaFeedbackDashboard,
  type BetaFeedbackRecord,
} from "../../../../lib/betaFeedbackAnalytics"
import { BETA_FEEDBACK_TABLE } from "../../../../lib/betaFeedbackDb"
import type { BetaFeedbackPayload } from "../../../../lib/betaFeedbackTypes"
import { isAdminGateEnabled } from "../../../../lib/admin"
import { isRequestAdmin } from "../../../../lib/requireAdmin"
import { createSupabaseServerClient } from "../../../../lib/supabaseServer"

type DbRow = {
  id: string
  created_at: string
  session_id: string | null
  track_name: string | null
  mastering_style: string | null
  stereo_width: number | null
  low_end: number | null
  responses: BetaFeedbackPayload
}

export async function GET() {
  if (!isBetaFeedbackEnabled()) {
    return NextResponse.json({ error: "Beta feedback is disabled" }, { status: 404 })
  }

  if (!isAdminGateEnabled()) {
    return NextResponse.json(
      { error: "Admin access is not configured. Set MASTRIFY_ADMIN_PASSWORD." },
      { status: 503 },
    )
  }

  if (!(await isRequestAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
  }

  const { data, error } = await supabase
    .from(BETA_FEEDBACK_TABLE)
    .select(
      "id, created_at, session_id, track_name, mastering_style, stereo_width, low_end, responses",
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[admin/beta-feedback] fetch failed:", error.message)
    return NextResponse.json({ error: "Could not load feedback" }, { status: 500 })
  }

  const records: BetaFeedbackRecord[] = ((data ?? []) as DbRow[]).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    session_id: row.session_id,
    track_name: row.track_name,
    mastering_style: row.mastering_style,
    stereo_width: row.stereo_width,
    low_end: row.low_end,
    responses: row.responses,
  }))

  return NextResponse.json(buildBetaFeedbackDashboard(records))
}
