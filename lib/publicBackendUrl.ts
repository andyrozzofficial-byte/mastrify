/**
 * Public Railway API base URL (no trailing slash).
 * Set NEXT_PUBLIC_MASTRIFY_API_URL on Vercel to override (e.g. staging backend).
 */
const DEFAULT_BASE = "https://mastrify-backend-production.up.railway.app"

function normalizeBase(raw: string | undefined): string {
  const s = (raw ?? "").trim().replace(/\/+$/, "")
  return s || DEFAULT_BASE
}

export const PUBLIC_BACKEND_API_BASE = normalizeBase(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MASTRIFY_API_URL : undefined
)

/** e.g. publicBackendUrl("/upload") → full URL */
export function publicBackendUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${PUBLIC_BACKEND_API_BASE}${p}`
}
