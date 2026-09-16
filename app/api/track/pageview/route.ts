import { NextResponse } from "next/server"
import {
  countryFromRequestHeaders,
  parseDeviceType,
  parseUtmParams,
  writePageView,
} from "../../../../lib/siteTracking"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : ""
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  const path = typeof body.path === "string" ? body.path.trim() : ""
  if (!visitorId || !sessionId || !path) {
    return NextResponse.json({ error: "visitorId, sessionId, and path required" }, { status: 400 })
  }

  if (path.startsWith("/admin")) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const search = typeof body.search === "string" ? body.search : ""
  const utm = parseUtmParams(search)
  const userAgent = request.headers.get("user-agent")

  const result = await writePageView({
    visitorId,
    sessionId,
    path,
    referrer: typeof body.referrer === "string" ? body.referrer : null,
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
    deviceType: parseDeviceType(userAgent),
    country: countryFromRequestHeaders(request.headers),
  })

  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
