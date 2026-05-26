/** Client-side guards against refresh / double-click exploits for beta metrics. */

function key(kind: "master-complete" | "download", sessionId: string): string {
  return `mastrify:beta-${kind}:${sessionId.trim()}`
}

export function hasClientReportedBetaMasterComplete(sessionId: string): boolean {
  const sid = sessionId.trim()
  if (!sid || typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(key("master-complete", sid)) === "1"
  } catch {
    return false
  }
}

export function markClientBetaMasterComplete(sessionId: string): void {
  const sid = sessionId.trim()
  if (!sid || typeof window === "undefined") return
  try {
    sessionStorage.setItem(key("master-complete", sid), "1")
  } catch {
    /* ignore */
  }
}

export function hasClientReportedBetaDownload(sessionId: string): boolean {
  const sid = sessionId.trim()
  if (!sid || typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(key("download", sid)) === "1"
  } catch {
    return false
  }
}

export function markClientBetaDownload(sessionId: string): void {
  const sid = sessionId.trim()
  if (!sid || typeof window === "undefined") return
  try {
    sessionStorage.setItem(key("download", sid), "1")
  } catch {
    /* ignore */
  }
}
