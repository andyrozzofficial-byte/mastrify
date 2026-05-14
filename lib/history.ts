export type HistoryKind = "analysis" | "master"

export type HistoryEntry = {
  id: string
  kind: HistoryKind
  name: string
  createdAt: number
  mixQuality?: number
  lufs?: number
  masteredUrl?: string
}

const KEY = "mastrify_project_history"
const MAX = 50

function readRaw(): HistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getHistory(): HistoryEntry[] {
  return readRaw().sort((a, b) => b.createdAt - a.createdAt)
}

export function appendHistory(entry: Omit<HistoryEntry, "id" | "createdAt"> & { id?: string; createdAt?: number }) {
  if (typeof window === "undefined") return
  const list = readRaw()
  const row: HistoryEntry = {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: entry.createdAt ?? Date.now(),
    kind: entry.kind,
    name: entry.name,
    mixQuality: entry.mixQuality,
    lufs: entry.lufs,
    masteredUrl: entry.masteredUrl,
  }
  const next = [row, ...list.filter((x) => x.id !== row.id)].slice(0, MAX)
  window.localStorage.setItem(KEY, JSON.stringify(next))
}
