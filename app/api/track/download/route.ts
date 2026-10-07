import { NextResponse } from "next/server"
import { parseDownloadEvent, writeDownloadEvent } from "../../../../lib/siteDownloads"

/** Download click from /tools (sent with sendBeacon; the download itself never waits for this). */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const event = parseDownloadEvent(body)
  if (!event) {
    return NextResponse.json({ error: "product (audio_tools|desktop), os (mac|windows), optional plugin required" }, { status: 400 })
  }

  const result = await writeDownloadEvent(event)
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
