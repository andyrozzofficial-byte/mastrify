import { NextResponse } from "next/server"
import { requireAdminApi } from "../../../../../lib/adminApi"
import { updateBetaIssueStatus } from "../../../../../lib/betaIssues"
import { isBetaIssueStatus } from "../../../../../lib/betaIssueTypes"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminApi("/api/admin/issues")
  if (auth.error) return auth.error

  const { id } = await params
  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const status = typeof body.status === "string" ? body.status.trim() : ""
  if (!isBetaIssueStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const result = await updateBetaIssueStatus(id, status)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
