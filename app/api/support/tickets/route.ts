import { NextResponse } from "next/server"
import { syncBetaProfileFromActivity } from "../../../../lib/betaUserData"
import { createPublicSupportTicket } from "../../../../lib/supportTickets"
import type { SupportSessionContext } from "../../../../lib/supportTypes"
import { isSupportTicketCategory } from "../../../../lib/supportTypes"

export async function POST(request: Request) {
  let body: {
    email?: string
    name?: string
    category?: string
    message?: string
    sessionContext?: SupportSessionContext
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""
  const category = typeof body.category === "string" ? body.category.trim() : ""

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "Please describe your issue (at least 10 characters)" }, { status: 400 })
  }
  if (!isSupportTicketCategory(category)) {
    return NextResponse.json({ error: "Please select a category" }, { status: 400 })
  }

  const sessionContext =
    body.sessionContext && typeof body.sessionContext === "object" ? body.sessionContext : null

  const result = await createPublicSupportTicket({
    email,
    name: body.name,
    category,
    message,
    sessionContext,
  })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  await syncBetaProfileFromActivity(email)

  return NextResponse.json({ ok: true, id: result.id })
}
