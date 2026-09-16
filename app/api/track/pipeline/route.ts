import { NextResponse } from "next/server"
import { writePipelineEvent } from "../../../../lib/pipelineTracking"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  const eventType = body.eventType
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }
  if (eventType !== "upload" && eventType !== "analyze") {
    return NextResponse.json({ error: "eventType must be upload or analyze" }, { status: 400 })
  }

  const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : ""
  const metadata = visitorId ? { visitor_id: visitorId } : undefined

  const result = await writePipelineEvent({
    sessionId,
    eventType,
    trackName: typeof body.trackName === "string" ? body.trackName : null,
    userEmail: typeof body.userEmail === "string" ? body.userEmail : null,
    metadata,
  })

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
