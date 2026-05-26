import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAllBetaIssues } from "../../../../lib/betaIssues"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/issues")
  if (auth.error) return auth.error

  const data = await fetchAllBetaIssues()
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json({ rows: data })
}
