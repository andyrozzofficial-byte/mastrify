import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { fetchAdminFeedback, updateFeedbackItem } from "../../../../lib/adminData"
import { isAdminItemStatus } from "../../../../lib/adminTypes"

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  const data = await fetchAdminFeedback()
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json({ rows: data })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  let body: { id?: string; status?: string; admin_notes?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  if (body.status && !isAdminItemStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const result = await updateFeedbackItem(body.id, {
    status: body.status,
    admin_notes: body.admin_notes,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
