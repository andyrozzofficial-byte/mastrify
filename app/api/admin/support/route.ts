import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../lib/adminApi"
import { ingestDebug, ingestError } from "../../../../lib/adminIngestDebug"
import { createSupportItem, fetchAdminSupport, updateSupportItem } from "../../../../lib/adminData"
import {
  isAdminSupportPriority,
  isAdminSupportStatus,
  type AdminSupportPriority,
  type AdminSupportStatus,
} from "../../../../lib/adminTypes"

export async function GET() {
  const auth = await requireAdminApi("/api/admin/support")
  if (auth.error) {
    ingestError("GET /api/admin/support", { stage: "auth", status: 401 })
    return auth.error
  }

  ingestDebug("GET /api/admin/support", { stage: "auth_ok", role: auth.role })

  const data = await fetchAdminSupport()
  if ("error" in data) {
    ingestError("GET /api/admin/support", { stage: "query", error: data.error })
    return NextResponse.json({ error: data.error, rows: [] }, { status: 503 })
  }
  return NextResponse.json({ rows: data, count: data.length })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi("/api/admin/support")
  if (auth.error) return auth.error

  let body: {
    email?: string
    name?: string
    subject?: string
    message?: string
    source?: string
    priority?: string
  }
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

  const priority =
    typeof body.priority === "string" && isAdminSupportPriority(body.priority)
      ? body.priority
      : undefined

  const result = await createSupportItem({
    email,
    name: body.name,
    subject: body.subject,
    message,
    source: body.source,
    priority,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: result.id })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi("/api/admin/support")
  if (auth.error) return auth.error

  let body: { id?: string; status?: string; priority?: string; admin_notes?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  let status: AdminSupportStatus | undefined
  if (body.status !== undefined) {
    if (!isAdminSupportStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    status = body.status
  }
  let priority: AdminSupportPriority | undefined
  if (body.priority !== undefined) {
    if (!isAdminSupportPriority(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
    }
    priority = body.priority
  }

  const result = await updateSupportItem(body.id, {
    status,
    priority,
    admin_notes: body.admin_notes,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
