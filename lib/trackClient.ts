/** Fire-and-forget client calls to /api/track/* — never block UX on analytics. */

import { getOrCreateSiteSessionId, getOrCreateVisitorId } from "./visitorId"

export function trackPageView(input: { path: string; search?: string }): void {
  if (!input.path.trim() || input.path.startsWith("/admin")) return
  void fetch("/api/track/pageview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSiteSessionId(),
      path: input.path,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      search: input.search ?? "",
    }),
  }).catch(() => undefined)
}

export function trackPipelineEvent(input: {
  sessionId: string
  eventType: "upload" | "analyze"
  trackName?: string | null
  userEmail?: string | null
  visitorId?: string | null
}): void {
  if (!input.sessionId.trim()) return
  void fetch("/api/track/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      visitorId: input.visitorId?.trim() || getOrCreateVisitorId(),
    }),
  }).catch(() => undefined)
}

export function trackMasterComplete(input: {
  sessionId: string
  objectKey?: string | null
  trackName?: string | null
  masteringStyle?: string | null
  processingTimeMs?: number | null
  masterLufs?: number | null
  userEmail?: string | null
}): void {
  if (!input.sessionId.trim()) return
  void fetch("/api/track/master-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => undefined)
}

export function trackMasterFailed(input: {
  sessionId: string
  trackName?: string | null
  errorLog?: string | null
}): void {
  if (!input.sessionId.trim()) return
  void fetch("/api/track/master-failed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => undefined)
}
