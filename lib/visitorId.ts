import { createMasterSessionId } from "./masterSessionId"

const VISITOR_STORAGE_KEY = "mastrify:visitor-id"
const SITE_SESSION_STORAGE_KEY = "mastrify:site-session-id"

/** Persistent cross-session visitor id (localStorage, ~90 day browser retention). */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return createMasterSessionId()
  try {
    const existing = localStorage.getItem(VISITOR_STORAGE_KEY)?.trim()
    if (existing) return existing
    const id = createMasterSessionId()
    localStorage.setItem(VISITOR_STORAGE_KEY, id)
    return id
  } catch {
    return createMasterSessionId()
  }
}

/** Browser tab session for website traffic (sessionStorage). */
export function getOrCreateSiteSessionId(): string {
  if (typeof window === "undefined") return createMasterSessionId()
  try {
    const existing = sessionStorage.getItem(SITE_SESSION_STORAGE_KEY)?.trim()
    if (existing) return existing
    const id = createMasterSessionId()
    sessionStorage.setItem(SITE_SESSION_STORAGE_KEY, id)
    return id
  } catch {
    return createMasterSessionId()
  }
}
