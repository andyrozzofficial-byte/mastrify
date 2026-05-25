import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../../lib/adminApi"
import { appendSupportReply } from "../../../../../../lib/supportTickets"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("/api/admin/support")
  if (auth.error) return auth.error

  const { id } = await context.params
  let body: { message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const result = await appendSupportReply(id, message, "admin")
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
