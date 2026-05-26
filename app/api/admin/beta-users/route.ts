import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchBetaUsers } from "../../../../lib/betaUserData"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/beta-users")
  if (auth.error) return auth.error

  const data = await fetchBetaUsers()
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  const sample = data[0]
  if (sample) {
    console.log("[admin-api] beta-users sample", {
      email: sample.email,
      betaPoints: sample.betaPoints,
      masterCount: sample.masterCount,
      feedbackCount: sample.feedbackCount,
    })
  }
  return NextResponse.json({ rows: data })
}
