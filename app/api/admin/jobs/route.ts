import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminJobs } from "../../../../lib/adminData"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/jobs")
  if (auth.error) return auth.error

  const data = await fetchAdminJobs()
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json({ rows: data })
}
