export type ActionCenterDisposition = "fixed" | "ignored" | "tracked"

const STORAGE_KEY = "mastrify-admin-action-center"

function readMap(): Record<string, ActionCenterDisposition> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ActionCenterDisposition>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function getActionCenterDispositions(): Record<string, ActionCenterDisposition> {
  return readMap()
}

export function setActionCenterDisposition(issueId: string, disposition: ActionCenterDisposition) {
  if (typeof window === "undefined") return
  const map = readMap()
  map[issueId] = disposition
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function clearActionCenterDisposition(issueId: string) {
  if (typeof window === "undefined") return
  const map = readMap()
  delete map[issueId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}
