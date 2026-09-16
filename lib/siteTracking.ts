import { SITE_PAGE_VIEWS_TABLE } from "./adminData"
import { createSupabaseServerClient } from "./supabaseServer"
import { statsDebug } from "./statsDebug"

export type DeviceType = "desktop" | "mobile" | "tablet"

export type WritePageViewInput = {
  visitorId: string
  sessionId: string
  path: string
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  deviceType: DeviceType
  country?: string | null
}

export function parseDeviceType(userAgent: string | null): DeviceType {
  const ua = userAgent ?? ""
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet"
  if (/Mobile|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile"
  return "desktop"
}

export function parseReferrerHost(referrer: string | null | undefined): string | null {
  const raw = referrer?.trim()
  if (!raw) return null
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "")
    return host || null
  } catch {
    return null
  }
}

export function normalizeTrafficReferrerLabel(referrerHost: string | null | undefined): string {
  const host = referrerHost?.trim()
  return host || "Direct / none"
}

export function countryFromRequestHeaders(headers: Headers): string | null {
  const code =
    headers.get("x-vercel-ip-country")?.trim() ||
    headers.get("cf-ipcountry")?.trim() ||
    headers.get("x-country-code")?.trim()
  if (!code || code === "XX" || code === "T1") return null
  return code.toUpperCase()
}

export function parseUtmParams(search: string): {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
} {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`)
    return {
      utmSource: params.get("utm_source")?.trim() || null,
      utmMedium: params.get("utm_medium")?.trim() || null,
      utmCampaign: params.get("utm_campaign")?.trim() || null,
    }
  } catch {
    return { utmSource: null, utmMedium: null, utmCampaign: null }
  }
}

/** Record a website pageview (no dedupe — each navigation is one view). */
export async function writePageView(
  input: WritePageViewInput,
): Promise<{ ok: true } | { error: string }> {
  const visitorId = input.visitorId.trim()
  const sessionId = input.sessionId.trim()
  const path = input.path.trim()
  if (!visitorId || !sessionId || !path) return { error: "visitorId, sessionId, and path required" }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data: priorVisitor } = await supabase
    .from(SITE_PAGE_VIEWS_TABLE)
    .select("id")
    .eq("visitor_id", visitorId)
    .limit(1)
    .maybeSingle()

  const referrer = input.referrer?.trim() || null
  const referrerHost = parseReferrerHost(referrer)

  const { error } = await supabase.from(SITE_PAGE_VIEWS_TABLE).insert({
    visitor_id: visitorId,
    session_id: sessionId,
    path,
    referrer,
    referrer_host: referrerHost,
    utm_source: input.utmSource?.trim() || null,
    utm_medium: input.utmMedium?.trim() || null,
    utm_campaign: input.utmCampaign?.trim() || null,
    device_type: input.deviceType,
    country: input.country?.trim().toUpperCase() || null,
    is_new_visitor: !priorVisitor?.id,
  })

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) {
      return { error: "admin_site_page_views table missing" }
    }
    return { error: error.message }
  }

  statsDebug("site pageview written", { path, visitorId, sessionId })
  return { ok: true }
}
