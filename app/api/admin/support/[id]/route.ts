import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { fetchSupportTicket } from "../../../../../lib/adminData"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/support")
  if (auth.error) return auth.error

  const { id } = await params
  const ticket = await fetchSupportTicket(id)
  if ("error" in ticket) {
    return NextResponse.json({ error: ticket.error }, { status: 404 })
  }
  return NextResponse.json({ ticket })
}
