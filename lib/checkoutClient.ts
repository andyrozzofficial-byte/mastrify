import { CHECKOUT_PAID_STORAGE_PREFIX, MASTER_PRICE_LABEL } from "./pricing"

export { MASTER_PRICE_LABEL }

const CHECKOUT_SESSION_STORAGE_PREFIX = "mastrify:checkout-session"

function sessionStorageKey(objectKey: string): string {
  return `${CHECKOUT_SESSION_STORAGE_PREFIX}:${objectKey}`
}

/** @deprecated use storeCheckoutSession */
export function markCheckoutPaid(objectKey: string, sessionId: string): void {
  storeCheckoutSession(objectKey, sessionId)
}

/** @deprecated use getStoredCheckoutSessionId + server verify */
export function isCheckoutPaidLocally(objectKey: string): boolean {
  return Boolean(getStoredCheckoutSessionId(objectKey))
}

export function storeCheckoutSession(objectKey: string, sessionId: string): void {
  if (!objectKey || !sessionId || typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(sessionStorageKey(objectKey), sessionId)
  } catch {
    /* ignore quota */
  }
}

export function getStoredCheckoutSessionId(objectKey: string): string | null {
  if (!objectKey || typeof sessionStorage === "undefined") return null
  try {
    return sessionStorage.getItem(sessionStorageKey(objectKey))
  } catch {
    return null
  }
}

export function clearStoredCheckoutSession(objectKey: string): void {
  if (!objectKey || typeof sessionStorage === "undefined") return
  try {
    sessionStorage.removeItem(sessionStorageKey(objectKey))
    sessionStorage.removeItem(`${CHECKOUT_PAID_STORAGE_PREFIX}:${objectKey}`)
  } catch {
    /* ignore */
  }
}

export async function startMasterCheckout(params: {
  objectKey: string
  trackTitle: string
  returnPath: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
  if (!res.ok || !data?.url) {
    return { ok: false, error: data?.error || "Could not start checkout. Please try again." }
  }
  window.location.href = data.url
  return { ok: true }
}

export async function verifyCheckoutReturn(
  sessionId: string,
  objectKey: string,
): Promise<{ paid: boolean; email?: string | null; sessionId?: string; error?: string }> {
  const qs = new URLSearchParams({
    session_id: sessionId,
    object_key: objectKey,
  })
  const res = await fetch(`/api/checkout/verify?${qs.toString()}`)
  const data = (await res.json().catch(() => null)) as {
    paid?: boolean
    email?: string | null
    sessionId?: string
    error?: string
  } | null
  if (!res.ok) {
    return { paid: false, error: data?.error || "Could not verify payment." }
  }
  return {
    paid: Boolean(data?.paid),
    email: data?.email ?? null,
    sessionId: data?.sessionId ?? sessionId,
    error: data?.error,
  }
}

export async function restoreVerifiedCheckoutSession(
  objectKey: string,
): Promise<{ paid: boolean; sessionId?: string; email?: string | null; error?: string }> {
  const storedSessionId = getStoredCheckoutSessionId(objectKey)
  if (!storedSessionId) {
    return { paid: false }
  }
  const result = await verifyCheckoutReturn(storedSessionId, objectKey)
  if (!result.paid) {
    clearStoredCheckoutSession(objectKey)
    return { paid: false, error: result.error }
  }
  return { paid: true, sessionId: result.sessionId ?? storedSessionId, email: result.email ?? null }
}
