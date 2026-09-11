import { CHECKOUT_PAID_STORAGE_PREFIX, MASTER_PRICE_LABEL } from "./pricing"

export { MASTER_PRICE_LABEL }

const CHECKOUT_SESSION_STORAGE_PREFIX = "mastrify:checkout-session"
const FREE_ORDER_STORAGE_PREFIX = "mastrify:free-order"

export type AppliedPromo = {
  code: string
  percentOff: number
  originalLabel: string
  finalLabel: string
  finalCents: number
  isFree: boolean
}

function sessionStorageKey(objectKey: string): string {
  return `${CHECKOUT_SESSION_STORAGE_PREFIX}:${objectKey}`
}

function freeOrderStorageKey(objectKey: string): string {
  return `${FREE_ORDER_STORAGE_PREFIX}:${objectKey}`
}

/** @deprecated use storeCheckoutSession */
export function markCheckoutPaid(objectKey: string, sessionId: string): void {
  storeCheckoutSession(objectKey, sessionId)
}

/** @deprecated use getStoredCheckoutSessionId + server verify */
export function isCheckoutPaidLocally(objectKey: string): boolean {
  return Boolean(getStoredCheckoutSessionId(objectKey) || getStoredFreeOrderId(objectKey))
}

export function storeCheckoutSession(objectKey: string, sessionId: string): void {
  if (!objectKey || !sessionId || typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(sessionStorageKey(objectKey), sessionId)
    sessionStorage.removeItem(freeOrderStorageKey(objectKey))
  } catch {
    /* ignore quota */
  }
}

export function storeFreeOrderId(objectKey: string, freeOrderId: string): void {
  if (!objectKey || !freeOrderId || typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(freeOrderStorageKey(objectKey), freeOrderId)
    sessionStorage.removeItem(sessionStorageKey(objectKey))
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

export function getStoredFreeOrderId(objectKey: string): string | null {
  if (!objectKey || typeof sessionStorage === "undefined") return null
  try {
    return sessionStorage.getItem(freeOrderStorageKey(objectKey))
  } catch {
    return null
  }
}

export function clearStoredCheckoutSession(objectKey: string): void {
  if (!objectKey || typeof sessionStorage === "undefined") return
  try {
    sessionStorage.removeItem(sessionStorageKey(objectKey))
    sessionStorage.removeItem(freeOrderStorageKey(objectKey))
    sessionStorage.removeItem(`${CHECKOUT_PAID_STORAGE_PREFIX}:${objectKey}`)
  } catch {
    /* ignore */
  }
}

export async function validatePromoCode(code: string): Promise<
  { ok: true; promo: AppliedPromo } | { ok: false; error: string }
> {
  const res = await fetch("/api/discount/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })
  const data = (await res.json().catch(() => null)) as {
    valid?: boolean
    code?: string
    percentOff?: number
    originalLabel?: string
    finalLabel?: string
    finalCents?: number
    isFree?: boolean
    error?: string
  } | null

  if (!res.ok || !data?.valid) {
    return { ok: false, error: data?.error || "Invalid discount code." }
  }

  return {
    ok: true,
    promo: {
      code: data.code ?? code.trim().toUpperCase(),
      percentOff: data.percentOff ?? 0,
      originalLabel: data.originalLabel ?? MASTER_PRICE_LABEL,
      finalLabel: data.finalLabel ?? MASTER_PRICE_LABEL,
      finalCents: data.finalCents ?? 900,
      isFree: Boolean(data.isFree),
    },
  }
}

export async function redeemFreePromoCode(params: {
  code: string
  objectKey: string
}): Promise<{ ok: true; freeOrderId: string } | { ok: false; error: string }> {
  const res = await fetch("/api/discount/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean
    freeOrderId?: string
    error?: string
  } | null

  if (!res.ok || !data?.ok || !data.freeOrderId) {
    return { ok: false, error: data?.error || "Could not apply free discount code." }
  }

  storeFreeOrderId(params.objectKey, data.freeOrderId)
  return { ok: true, freeOrderId: data.freeOrderId }
}

export async function startMasterCheckout(params: {
  objectKey: string
  trackTitle: string
  returnPath: string
  promoCode?: string
}): Promise<{ ok: true } | { ok: false; error: string; isFree?: boolean }> {
  const res = await fetch("/api/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  const data = (await res.json().catch(() => null)) as {
    url?: string
    error?: string
    isFree?: boolean
  } | null
  if (!res.ok || !data?.url) {
    return {
      ok: false,
      error: data?.error || "Could not start checkout. Please try again.",
      isFree: data?.isFree,
    }
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
): Promise<{ paid: boolean; sessionId?: string; freeOrderId?: string; email?: string | null; error?: string }> {
  const storedFreeOrderId = getStoredFreeOrderId(objectKey)
  if (storedFreeOrderId) {
    return { paid: true, freeOrderId: storedFreeOrderId }
  }

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
