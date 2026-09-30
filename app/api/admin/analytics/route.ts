import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminBusinessAnalytics } from "../../../../lib/adminBusinessAnalytics"
import { parseAnalyticsPeriod } from "../../../../lib/adminAnalyticsPeriods"

export async function GET(request: Request) {
  const auth = await requireAdminApi("/api/admin/analytics")
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const period = parseAnalyticsPeriod(searchParams.get("period"))

  const data = await fetchAdminBusinessAnalytics(period)
  if ("error" in data) {
    console.error("[admin-api] analytics failed", data.error)
    return NextResponse.json({ error: data.error, period }, { status: 200 })
  }
  return NextResponse.json(data)
}
