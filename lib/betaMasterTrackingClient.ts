import { isBetaFeedbackEnabled } from "./betaFeedbackFeature"
import { createMasterSessionId } from "./masterSessionId"
import { getBetaReporterEmail } from "./betaReporterEmail"
import { getStoredBetaEmail } from "./betaSessionStorage"
import type { BetaMasteringUiState } from "./betaPoints"
import type { BetaProfilePanelData } from "./betaProfilePanel"
import {
  resolveBetaDownloadObjectKey,
  resolveBetaMasterCompletionSessionId,
} from "./betaMasterTracking"
import { markClientBetaMasterComplete, markClientBetaDownload } from "./betaTrackingStorage"
import { PERF_DEBUG } from "./perfDebug"

export type RegisterBetaMasterCompletePayload = {
  sessionId: string
  objectKey?: string | null
  email?: string | null
  deliveryEmail?: string | null
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

function resolveCompletionSessionId(payload: RegisterBetaMasterCompletePayload): string {
  const resolved = resolveBetaMasterCompletionSessionId(payload.sessionId, payload.objectKey)
  if (resolved) return resolved
  return createMasterSessionId()
}

/** Idempotent: records one completed master per session_id (server is source of truth). */
export async function registerBetaMasterComplete(
  payload: RegisterBetaMasterCompletePayload,
): Promise<{
  ok: boolean
  alreadyCounted?: boolean
  created?: boolean
  betaUi?: BetaMasteringUiState | null
  panel?: BetaProfilePanelData | null
  sessionId?: string
}> {
  const resolvedSid = resolveBetaMasterCompletionSessionId(payload.sessionId, payload.objectKey)
  const sessionId = resolvedSid || createMasterSessionId()
  const email = getBetaReporterEmail(
    payload.email ?? getStoredBetaEmail(),
    payload.deliveryEmail,
  )

  if (PERF_DEBUG) {
    console.log("[beta-debug] master complete (client)", {
      sessionIdSent: sessionId,
      sessionIdSource: resolvedSid ? (payload.sessionId?.trim() ? "payload.sessionId" : "objectKey") : "generated",
      payloadSessionId: payload.sessionId,
      objectKey: payload.objectKey ?? null,
      email: email.includes("@") ? email : null,
      deliveryEmail: payload.deliveryEmail ?? null,
      trackName: payload.trackName ?? null,
    })
  }

  try {
    const res = await fetch("/api/beta/master/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId,
        objectKey: payload.objectKey ?? null,
        email: email.includes("@") ? email : undefined,
        deliveryEmail:
          payload.deliveryEmail?.trim() && payload.deliveryEmail.includes("@")
            ? payload.deliveryEmail.trim()
            : undefined,
        trackName: payload.trackName ?? null,
        masteringStyle: payload.masteringStyle ?? null,
        processingTimeMs: payload.processingTimeMs ?? null,
        masterLufs: payload.masterLufs ?? null,
      }),
    })
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean
      created?: boolean
      alreadyCounted?: boolean
      error?: string
      betaUi?: BetaMasteringUiState | null
      panel?: BetaProfilePanelData | null
    } | null

    if (!res.ok) {
      console.warn("[beta] master complete failed", json?.error ?? res.status, { sessionId })
      return { ok: false, sessionId }
    }

    if (json?.alreadyCounted) logBeta("master already counted")
    else if (json?.created) logBeta("master completed")

    if (json?.created || json?.alreadyCounted) {
      markClientBetaMasterComplete(sessionId)
    }
    applyPanelUpdate(json?.panel)

    return {
      ok: Boolean(json?.ok),
      alreadyCounted: json?.alreadyCounted,
      created: json?.created,
      betaUi: json?.betaUi ?? null,
      panel: json?.panel ?? null,
      sessionId,
    }
  } catch (err) {
    console.warn("[beta] master complete request failed", err)
    return { ok: false, sessionId }
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

  const panelPushed = Boolean(result.panel)
  if (!panelPushed) {
    await options?.refreshAccess?.({ silent: true })
    dispatchBetaProfileRefresh()
  }
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

  if (!result.panel) {
    await options?.refreshAccess?.({ silent: true })
    dispatchBetaProfileRefresh()
  }
  return true
}
