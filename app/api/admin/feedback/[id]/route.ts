import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { fetchAdminFeedbackById } from "../../../../../lib/adminData"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/feedback")
  if (auth.error) return auth.error

  const { id } = await params
  const row = await fetchAdminFeedbackById(id)
  if ("error" in row) {
    return NextResponse.json({ error: row.error }, { status: 404 })
  }
  return NextResponse.json({ row })
}
