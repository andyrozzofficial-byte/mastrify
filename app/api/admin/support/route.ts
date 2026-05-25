import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { createSupportItem, fetchAdminSupport, updateSupportItem } from "../../../../lib/adminData"
import { isAdminItemStatus } from "../../../../lib/adminTypes"

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  const data = await fetchAdminSupport()
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 500 })
  }
  return NextResponse.json({ rows: data })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.error) return auth.error

  let body: { email?: string; name?: string; subject?: string; message?: string; source?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!email || !message) {
    return NextResponse.json({ error: "Email and message required" }, { status: 400 })
  }

  const result = await createSupportItem({
    email,
    name: body.name,
    subject: body.subject,
    message,
    source: body.source,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: result.id })
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

  const result = await updateSupportItem(body.id, {
    status: body.status,
    admin_notes: body.admin_notes,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
