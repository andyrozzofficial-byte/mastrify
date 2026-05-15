export const ACCESS_COOKIE_NAME = "mastrify_access"
const ACCESS_PAYLOAD = "mastrify-access-v1"

export function isAccessGateEnabled(): boolean {
  return Boolean(process.env.MASTRIFY_ACCESS_PASSWORD?.trim())
}

export function getAccessSecret(): string {
  const secret = process.env.MASTRIFY_ACCESS_SECRET?.trim()
  if (secret) return secret
  const password = process.env.MASTRIFY_ACCESS_PASSWORD?.trim()
  if (password) return password
  return ""
}

export function isProtectedPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname.startsWith("/master")
}

export function isAccessBypassPath(pathname: string): boolean {
  return pathname === "/access" || pathname.startsWith("/api/access")
}

export function safeAccessRedirect(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/master"
  if (next === "/app" || next.startsWith("/app/") || next.startsWith("/master")) return next
  return "/master"
}

export async function createAccessToken(secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ACCESS_PAYLOAD))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyAccessToken(cookieValue: string | undefined, secret: string): Promise<boolean> {
  if (!cookieValue || !secret) return false
  const expected = await createAccessToken(secret)
  if (cookieValue.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < cookieValue.length; i++) {
    mismatch |= cookieValue.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}
