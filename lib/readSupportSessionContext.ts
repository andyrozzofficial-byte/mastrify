"use client"

import { masteringStyleLabel } from "./masterStyleLabels"

const MASTER_SESSION_STORAGE_KEY = "mastrify:master-session-v2"
import type { SupportSessionContext } from "./supportTypes"

type StoredMasterSession = {
  sessionId?: string
  fileName?: string
  stylePreset?: string
  masterLufs?: number | null
  processingTimeMs?: number | null
  masterObjectKey?: string
}

function readStoredSession(): StoredMasterSession | null {
  try {
    const raw = sessionStorage.getItem(MASTER_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { v?: number } & StoredMasterSession
    if (parsed.v !== 2) return null
    return parsed
  } catch {
    return null
  }
}

function readRecentErrors(): string[] {
  try {
    const raw = sessionStorage.getItem("mastrify:last-errors")
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? arr.map(String).slice(0, 5) : []
  } catch {
    return []
  }
}

/** Best-effort session metadata for support tickets (client-only). */
export function readSupportSessionContext(pathname?: string): SupportSessionContext {
  const stored = readStoredSession()
  const ctx: SupportSessionContext = { pathname: pathname ?? null }

  if (stored?.sessionId) ctx.sessionId = stored.sessionId
  if (stored?.fileName) ctx.trackName = stored.fileName
  if (stored?.stylePreset) ctx.masteringStyle = masteringStyleLabel(stored.stylePreset)
  if (stored?.masterLufs != null && Number.isFinite(stored.masterLufs)) ctx.lufs = stored.masterLufs
  if (stored?.processingTimeMs != null && Number.isFinite(stored.processingTimeMs)) {
    ctx.processingTimeMs = stored.processingTimeMs
  }
  if (stored?.masterObjectKey) ctx.fileId = stored.masterObjectKey

  const errors = readRecentErrors()
  if (errors.length) ctx.errorLogs = errors

  return ctx
}

/** Call from mastering flows when an API fails (keeps last few messages for support). */
export function recordSupportError(message: string) {
  try {
    const prev = readRecentErrors()
    const next = [message, ...prev].slice(0, 5)
    sessionStorage.setItem("mastrify:last-errors", JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
