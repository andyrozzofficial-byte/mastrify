import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import { getAccessSecret } from "./access"
import {
  BETA_USER_EMAIL_COOKIE,
  isValidBetaUserCookie,
  normalizeBetaEmail,
} from "./betaAccess"

export const BETA_SESSION_COOKIE = "mastrify_beta_session"

const SESSION_VERSION = 1
const MAGIC_VERSION = 1
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 400
const MAGIC_MAX_AGE_SEC = 60 * 30

type SessionPayload = { v: number; e: string; exp: number }
type MagicPayload = { v: number; e: string; exp: number; next: string }

export function getBetaSessionSecret(): string {
  const dedicated = process.env.MASTRIFY_BETA_SESSION_SECRET?.trim()
  if (dedicated) return dedicated
  const access = getAccessSecret()
  if (access) return access
  if (process.env.NODE_ENV === "production") return ""
  return "mastrify-dev-beta-session"
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
    const binary = atob(padded + pad)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

async function signPayload(payload: SessionPayload | MagicPayload, secret: string): Promise<string | null> {
  if (!secret) return null
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await hmacSign(body, secret)
  return `${body}.${sig}`
}

async function verifySignedToken<T extends SessionPayload | MagicPayload>(
  token: string | undefined,
  secret: string,
  expectedVersion: number,
): Promise<T | null> {
  if (!token || !secret) return null
  const dot = token.lastIndexOf(".")
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expectedSig = await hmacSign(body, secret)
  if (!timingSafeEqualHex(sig, expectedSig)) return null

  const bytes = fromBase64Url(body)
  if (!bytes) return null
  let parsed: T
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    return null
  }
  if (parsed.v !== expectedVersion || typeof parsed.e !== "string" || typeof parsed.exp !== "number") {
    return null
  }
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null
  if (!parsed.e.includes("@")) return null
  return parsed
}

export async function createBetaSessionToken(email: string): Promise<string | null> {
  const secret = getBetaSessionSecret()
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    e: normalizeBetaEmail(email),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  }
  return signPayload(payload, secret)
}

export async function verifyBetaSessionToken(
  token: string | undefined,
): Promise<{ email: string } | null> {
  const secret = getBetaSessionSecret()
  const parsed = await verifySignedToken<SessionPayload>(token, secret, SESSION_VERSION)
  if (!parsed) return null
  return { email: normalizeBetaEmail(parsed.e) }
}

export async function createBetaMagicLinkToken(email: string, next: string): Promise<string | null> {
  const secret = getBetaSessionSecret()
  const payload: MagicPayload = {
    v: MAGIC_VERSION,
    e: normalizeBetaEmail(email),
    exp: Math.floor(Date.now() / 1000) + MAGIC_MAX_AGE_SEC,
    next,
  }
  return signPayload(payload, secret)
}

export async function verifyBetaMagicLinkToken(
  token: string | undefined,
): Promise<{ email: string; next: string } | null> {
  const secret = getBetaSessionSecret()
  const parsed = await verifySignedToken<MagicPayload>(token, secret, MAGIC_VERSION)
  if (!parsed || typeof parsed.next !== "string") return null
  return { email: normalizeBetaEmail(parsed.e), next: parsed.next }
}

export async function resolveBetaEmailFromCookies(
  store: Pick<ReadonlyRequestCookies, "get">,
): Promise<string | null> {
  const sessionToken = store.get(BETA_SESSION_COOKIE)?.value
  const fromSession = await verifyBetaSessionToken(sessionToken)
  if (fromSession?.email) return fromSession.email

  const legacy = store.get(BETA_USER_EMAIL_COOKIE)?.value?.trim()
  if (isValidBetaUserCookie(legacy)) return normalizeBetaEmail(legacy!)
  return null
}

export async function hasValidBetaSessionCookie(
  sessionToken: string | undefined,
  legacyEmail: string | undefined,
): Promise<boolean> {
  const fromSession = await verifyBetaSessionToken(sessionToken)
  if (fromSession?.email) return true
  return isValidBetaUserCookie(legacyEmail)
}

export function resolveAppOrigin(request: Request): string {
  const envUrl =
    process.env.MASTRIFY_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (envUrl) return envUrl.replace(/\/$/, "")

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (!host) return "http://localhost:3000"
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
