import { isBetaFeedbackEnabled } from "./betaFeedbackFeature"
import { createMasterSessionId } from "./masterSessionId"
import { getStoredBetaEmail } from "./betaSessionStorage"
import type { BetaMasteringUiState } from "./betaPoints"
import type { BetaProfilePanelData } from "./betaProfilePanel"
import { resolveBetaDownloadObjectKey } from "./betaMasterTracking"
import {
  hasClientReportedBetaDownload,
  hasClientReportedBetaMasterComplete,
  markClientBetaDownload,
  markClientBetaMasterComplete,
} from "./betaTrackingStorage"

export type RegisterBetaMasterCompletePayload = {
  sessionId: string
  email?: string | null
  trackName?: string | null
  masteringStyle?: string | null
  processingTimeMs?: number | null
  masterLufs?: number | null
}

export type RegisterBetaMasterDownloadPayload = {
  objectKey?: string | null
  sessionId?: string | null
  trackTitle?: string | null
  expiresAt?: string | null
  email?: string | null
}

function logBeta(message: string) {
  console.log(`[beta] ${message}`)
}

export const BETA_PROFILE_REFRESH_EVENT = "mastrify:beta-profile-refresh"
export const BETA_PROFILE_PANEL_EVENT = "mastrify:beta-profile-panel"

export function dispatchBetaProfileRefresh() {
  if (typeof window === "undefined") return
  logBeta("profile refreshed")
  window.dispatchEvent(new CustomEvent(BETA_PROFILE_REFRESH_EVENT))
}

export function dispatchBetaProfilePanel(panel: BetaProfilePanelData) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(BETA_PROFILE_PANEL_EVENT, { detail: panel }))
}

function applyPanelUpdate(panel: BetaProfilePanelData | null | undefined) {
  if (panel) dispatchBetaProfilePanel(panel)
}

/** Idempotent: records one completed master per session_id. */
export async function registerBetaMasterComplete(
  payload: RegisterBetaMasterCompletePayload,
): Promise<{
  ok: boolean
  alreadyCounted?: boolean
  betaUi?: BetaMasteringUiState | null
  panel?: BetaProfilePanelData | null
}> {
  const sessionId = payload.sessionId.trim() || createMasterSessionId()
  const email = payload.email?.trim() || getStoredBetaEmail()
  if (!email?.includes("@")) {
    console.warn("[beta] master complete skipped: no beta email")
    return { ok: false }
  }

  if (hasClientReportedBetaMasterComplete(sessionId)) {
    return { ok: true, alreadyCounted: true }
  }

  try {
    const res = await fetch("/api/beta/master/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId,
        email,
        trackName: payload.trackName ?? null,
        masteringStyle: payload.masteringStyle ?? null,
        processingTimeMs: payload.processingTimeMs ?? null,
        masterLufs: payload.masterLufs ?? null,
      }),
    })
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean
      alreadyCounted?: boolean
      error?: string
      betaUi?: BetaMasteringUiState | null
      panel?: BetaProfilePanelData | null
    } | null

    if (!res.ok) {
      console.warn("[beta] master complete failed", json?.error ?? res.status, { email, sessionId })
      return { ok: false }
    }

    if (json?.alreadyCounted) logBeta("master already counted")
    else if (json?.ok) logBeta("master completed")

    if (json?.ok) markClientBetaMasterComplete(sessionId)

    applyPanelUpdate(json?.panel)

    return {
      ok: Boolean(json?.ok),
      alreadyCounted: json?.alreadyCounted,
      betaUi: json?.betaUi ?? null,
      panel: json?.panel ?? null,
    }
  } catch (err) {
    console.warn("[beta] master complete request failed", err)
    return { ok: false }
  }
}

export async function registerBetaMasterDownload(
  payload: RegisterBetaMasterDownloadPayload,
): Promise<{
  ok: boolean
  alreadyCounted?: boolean
  panel?: BetaProfilePanelData | null
}> {
  const email = payload.email?.trim() || getStoredBetaEmail()
  const sessionId = payload.sessionId?.trim() || ""
  const objectKey = resolveBetaDownloadObjectKey(payload.objectKey, payload.sessionId)
  if (!email?.includes("@")) {
    console.warn("[beta] download skipped: no beta email")
    return { ok: false }
  }

  if (sessionId && hasClientReportedBetaDownload(sessionId)) {
    return { ok: true, alreadyCounted: true }
  }

  try {
    const res = await fetch("/api/beta/master/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        objectKey,
        sessionId: payload.sessionId ?? null,
        email,
        trackTitle: payload.trackTitle ?? null,
        expiresAt: payload.expiresAt ?? null,
      }),
    })
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean
      alreadyCounted?: boolean
      error?: string
      panel?: BetaProfilePanelData | null
    } | null
    if (!res.ok) {
      console.warn("[beta] download register failed", json?.error ?? res.status)
      return { ok: false }
    }
    if (json?.alreadyCounted) logBeta("download already counted")
    else logBeta("download registered")

    if (json?.ok && sessionId) markClientBetaDownload(sessionId)

    applyPanelUpdate(json?.panel)
    return {
      ok: Boolean(json?.ok),
      alreadyCounted: json?.alreadyCounted,
      panel: json?.panel ?? null,
    }
  } catch (err) {
    console.warn("[beta] download register request failed", err)
    return { ok: false }
  }
}

/** Call once when a mastered file is ready — not on download or feedback. */
export async function reportBetaMasterCompleted(
  payload: RegisterBetaMasterCompletePayload,
  options?: {
    refreshAccess?: (opts?: { silent?: boolean }) => Promise<boolean>
    applyBetaUi?: (ui: BetaMasteringUiState | null) => void
  },
): Promise<boolean> {
  if (!isBetaFeedbackEnabled()) return false

  const result = await registerBetaMasterComplete(payload)
  if (!result.ok) return false

  if (result.betaUi && options?.applyBetaUi) {
    options.applyBetaUi(result.betaUi)
  }

  await options?.refreshAccess?.({ silent: true })
  dispatchBetaProfileRefresh()
  return true
}

/** Call when user taps Download Master — separate from master completion. */
export async function reportBetaMasterDownload(
  payload: RegisterBetaMasterDownloadPayload,
  options?: {
    refreshAccess?: (opts?: { silent?: boolean }) => Promise<boolean>
  },
): Promise<boolean> {
  if (!isBetaFeedbackEnabled()) return false

  const result = await registerBetaMasterDownload(payload)
  if (!result.ok) return false

  await options?.refreshAccess?.({ silent: true })
  dispatchBetaProfileRefresh()
  return true
}
