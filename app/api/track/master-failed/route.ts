import { NextResponse } from "next/server"
import { recordFailedMasterJob } from "../../../../lib/pipelineTracking"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }

  const result = await recordFailedMasterJob({
    sessionId,
    trackName: typeof body.trackName === "string" ? body.trackName : null,
    errorLog: typeof body.errorLog === "string" ? body.errorLog : null,
  })

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
