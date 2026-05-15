/**
 * Public API base URL (no trailing slash).
 * Production default: Railway. Override with NEXT_PUBLIC_MASTRIFY_API_URL on Vercel.
 *
 * In local development, always use the local mastering server (see resolvePublicBackendBase).
 */
const DEFAULT_BASE = "https://mastrify-backend-production.up.railway.app"
const LOCAL_DEV_BACKEND = "http://localhost:3001"

let devBackendLogged = false

function normalizeBase(raw: string | undefined): string {
  const s = (raw ?? "").trim().replace(/\/+$/, "")
  return s || DEFAULT_BASE
}

function resolvePublicBackendBase(): string {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    if (!devBackendLogged && typeof console !== "undefined") {
      devBackendLogged = true
      console.log("[frontend] using local mastering backend:", LOCAL_DEV_BACKEND)
    }
    return LOCAL_DEV_BACKEND
  }
  return normalizeBase(
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MASTRIFY_API_URL : undefined
  )
}

export const PUBLIC_BACKEND_API_BASE = resolvePublicBackendBase()

/** e.g. publicBackendUrl("/upload") → full URL */
export function publicBackendUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${PUBLIC_BACKEND_API_BASE}${p}`
}
