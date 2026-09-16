import { NextResponse } from "next/server"
import { recordProductionMasterComplete, writePipelineEvent } from "../../../../lib/pipelineTracking"

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

  const objectKey = typeof body.objectKey === "string" ? body.objectKey.trim() : ""
  const trackName = typeof body.trackName === "string" ? body.trackName : null
  const masteringStyle = typeof body.masteringStyle === "string" ? body.masteringStyle : null
  const userEmail = typeof body.userEmail === "string" ? body.userEmail : null
  const processingTimeMs =
    typeof body.processingTimeMs === "number" && Number.isFinite(body.processingTimeMs)
      ? body.processingTimeMs
      : null
  const masterLufs =
    typeof body.masterLufs === "number" && Number.isFinite(body.masterLufs) ? body.masterLufs : null

  const result = await recordProductionMasterComplete({
    sessionId,
    objectKey: objectKey || null,
    trackName,
    masteringStyle,
    processingTimeMs,
    masterLufs,
    email: userEmail,
  })

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  await writePipelineEvent({
    sessionId,
    eventType: "master_complete",
    trackName,
    userEmail,
  })

  return NextResponse.json({ ok: true, created: result.created })
}
