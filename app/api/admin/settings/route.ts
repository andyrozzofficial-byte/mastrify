import { NextResponse } from "next/server"
import { isAdminGateEnabled } from "../../../../lib/admin"
import { requireAdminApi } from "../../../../lib/adminApi"
import { defaultAdminRole } from "../../../../lib/adminRoles"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/settings")
  if (auth.error) return auth.error

  return NextResponse.json({
    role: auth.role,
    gateEnabled: isAdminGateEnabled(),
    defaultRole: defaultAdminRole(),
    features: {
      betaFeedback: process.env.ENABLE_BETA_FEEDBACK === "true",
      serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    migrations: [
      "supabase/beta_master_feedback.sql",
      "supabase/admin_dashboard.sql",
      "supabase/admin_backoffice.sql",
    ],
  })
}
