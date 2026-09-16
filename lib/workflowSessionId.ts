import { createMasterSessionId } from "./masterSessionId"

const STORAGE_KEY = "mastrify:workflow-session-id"

/** Stable browser session for one upload → master workflow (survives refresh within tab). */
export function getOrCreateWorkflowSessionId(): string {
  if (typeof window === "undefined") return createMasterSessionId()
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY)?.trim()
    if (existing) return existing
    const id = createMasterSessionId()
    sessionStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return createMasterSessionId()
  }
}

export function resetWorkflowSessionId(): string {
  const id = createMasterSessionId()
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }
  return id
}
