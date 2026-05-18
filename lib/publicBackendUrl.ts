/**
 * Public API base URL (no trailing slash).
 * Production always uses the live Railway backend. Do not let stale Vercel
 * env vars override this value in production builds.
 *
 * Local development can still override the backend with NEXT_PUBLIC_MASTRIFY_API_URL,
 * NEXT_PUBLIC_API_URL, or API_URL.
 */
const PRODUCTION_BACKEND = "https://mastrify-backend-production.up.railway.app"
const LOCAL_DEV_BACKEND = "http://localhost:3001"

let devBackendLogged = false

function normalizeBase(raw: string | undefined): string {
  const s = (raw ?? "").trim().replace(/\/+$/, "")
  return s || PRODUCTION_BACKEND
}

function firstConfiguredEnv(): string | undefined {
  if (typeof process === "undefined") return undefined
  return (
    process.env.NEXT_PUBLIC_MASTRIFY_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL
  )
}

function resolvePublicBackendBase(): string {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    const localBase = normalizeBase(firstConfiguredEnv() || LOCAL_DEV_BACKEND)
    if (!devBackendLogged && typeof console !== "undefined") {
      devBackendLogged = true
      console.log("[frontend] using local mastering backend:", localBase)
    }
    return localBase
  }
  return PRODUCTION_BACKEND
}

export const PUBLIC_BACKEND_API_BASE = resolvePublicBackendBase()

/** e.g. publicBackendUrl("/upload") → full URL */
export function publicBackendUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${PUBLIC_BACKEND_API_BASE}${p}`
}
