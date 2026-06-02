import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminCustomers } from "../../../../lib/adminData"

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  const data = await fetchAdminCustomers()
  if ("error" in data) {
    console.error("[admin-api] customers failed", data.error)
    return NextResponse.json({ error: data.error, rows: [] }, { status: 200 })
  }
  return NextResponse.json({ rows: data })
}
