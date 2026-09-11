import { NextResponse } from "next/server"
import { createPublicSupportTicket } from "../../../../lib/supportTickets"

export async function POST(request: Request) {
  let body: {
    email?: string
    name?: string
    category?: string
    message?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const result = await createPublicSupportTicket({
    email: typeof body.email === "string" ? body.email : "",
    name: typeof body.name === "string" ? body.name : null,
    category: typeof body.category === "string" ? body.category : "other",
    message: typeof body.message === "string" ? body.message : "",
    sessionContext: { pathname: "/contact" },
  })

  if ("error" in result) {
    const status = result.error.includes("required") || result.error.includes("Invalid") ? 400 : 503
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, id: result.id })
}
