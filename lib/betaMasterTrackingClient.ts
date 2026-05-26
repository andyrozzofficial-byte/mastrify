import { isBetaFeedbackEnabled } from "./betaFeedbackFeature"

export type RegisterBetaMasterCompletePayload = {
  sessionId: string
  trackName?: string | null
  masteringStyle?: string | null
  processingTimeMs?: number | null
  masterLufs?: number | null
}

export type RegisterBetaMasterDownloadPayload = {
  objectKey: string
  trackTitle?: string | null
  expiresAt?: string | null
}

function logBeta(message: string) {
  console.log(`[beta] ${message}`)
}

/** Idempotent: records one completed master per session_id. */
export async function registerBetaMasterComplete(
  payload: RegisterBetaMasterCompletePayload,
): Promise<{ ok: boolean; alreadyCounted?: boolean }> {
  if (!isBetaFeedbackEnabled()) return { ok: false }
  const sessionId = payload.sessionId.trim()
  if (!sessionId) return { ok: false }

  try {
    const res = await fetch("/api/beta/master/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId,
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
    } | null

    if (!res.ok) {
      console.warn("[beta] master complete failed", json?.error ?? res.status)
      return { ok: false }
    }

    if (json?.alreadyCounted) logBeta("master already counted")
    else if (json?.ok) logBeta("master completed")

    return { ok: Boolean(json?.ok), alreadyCounted: json?.alreadyCounted }
  } catch (err) {
    console.warn("[beta] master complete request failed", err)
    return { ok: false }
  }
}

export async function registerBetaMasterDownload(
  payload: RegisterBetaMasterDownloadPayload,
): Promise<boolean> {
  if (!isBetaFeedbackEnabled()) return false
  const objectKey = payload.objectKey.trim()
  if (!objectKey) return false

  try {
    const res = await fetch("/api/beta/master/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        objectKey,
        trackTitle: payload.trackTitle ?? null,
        expiresAt: payload.expiresAt ?? null,
      }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (!res.ok) {
      console.warn("[beta] download register failed", json?.error ?? res.status)
      return false
    }
    logBeta("download registered")
    return Boolean(json?.ok)
  } catch (err) {
    console.warn("[beta] download register request failed", err)
    return false
  }
}

export const BETA_PROFILE_REFRESH_EVENT = "mastrify:beta-profile-refresh"

export function dispatchBetaProfileRefresh() {
  if (typeof window === "undefined") return
  logBeta("profile refreshed")
  window.dispatchEvent(new CustomEvent(BETA_PROFILE_REFRESH_EVENT))
}
