import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminAnalytics } from "../../../../lib/adminData"

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  const data = await fetchAdminAnalytics()
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json(data)
}
