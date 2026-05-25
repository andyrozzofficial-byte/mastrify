export const ADMIN_COOKIE_NAME = "mastrify_admin"
const ADMIN_PAYLOAD = "mastrify-admin-v1"

export function isAdminGateEnabled(): boolean {
  return Boolean(getAdminPassword())
}

export function getAdminPassword(): string {
  return process.env.MASTRIFY_ADMIN_PASSWORD?.trim() || ""
}

export function getAdminSecret(): string {
  const secret = process.env.MASTRIFY_ADMIN_SECRET?.trim()
  if (secret) return secret
  return process.env.MASTRIFY_ADMIN_PASSWORD?.trim() || ""
}

export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin")
}

export function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin")
}

export async function createAdminToken(secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ADMIN_PAYLOAD))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyAdminToken(
  cookieValue: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!cookieValue || !secret) return false
  const expected = await createAdminToken(secret)
  if (cookieValue.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < cookieValue.length; i++) {
    mismatch |= cookieValue.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}
