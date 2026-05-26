const STORAGE_KEY = "mastrify_beta_post_master_v1"

type Status = "skipped" | "submitted"

function readMap(): Record<string, Status> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === "object" ? (parsed as Record<string, Status>) : {}
  } catch {
    return {}
  }
}

function writeMap(map: Record<string, Status>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function readPostMasterFeedbackStatus(sessionId: string): Status | null {
  const id = sessionId.trim()
  if (!id) return null
  return readMap()[id] ?? null
}

export function writePostMasterFeedbackStatus(sessionId: string, status: Status) {
  const id = sessionId.trim()
  if (!id) return
  const map = readMap()
  map[id] = status
  writeMap(map)
}
