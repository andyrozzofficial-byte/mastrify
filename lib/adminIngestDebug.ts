import { getSupabaseEnvStatus, getSupabaseKeySource, type SupabaseKeySource } from "./supabaseServer"

/** Server-only ingest/admin-list tracing — set MASTRIFY_ADMIN_INGEST_DEBUG=1 */
export const MASTRIFY_ADMIN_INGEST_DEBUG =
  typeof window === "undefined" &&
  (process.env.MASTRIFY_ADMIN_INGEST_DEBUG === "1" ||
    (process.env.NODE_ENV === "development" && process.env.MASTRIFY_DEBUG === "1"))

export function ingestDebug(route: string, detail: Record<string, unknown>): void {
  if (!MASTRIFY_ADMIN_INGEST_DEBUG) return
  console.log(`[mastrify-ingest] ${route}`, {
    ...getSupabaseEnvStatus(),
    ...detail,
  })
}

export function ingestError(route: string, detail: Record<string, unknown>): void {
  console.error(`[mastrify-ingest] ${route}`, {
    keySource: getSupabaseKeySource(),
    ...detail,
  })
}

/** Admin inbox + issue list reads require service_role (RLS is service_role-only). */
export function requireServiceRoleForAdminTable(
  route: string,
): { ok: true; keySource: SupabaseKeySource } | { ok: false; error: string } {
  const keySource = getSupabaseKeySource()
  if (keySource === "service_role") {
    return { ok: true, keySource }
  }
  const message =
    "SUPABASE_SERVICE_ROLE_KEY is required for admin_support_inbox and beta_reported_issues (server reads/writes are blocked with anon key)."
  ingestError(route, { keySource, env: getSupabaseEnvStatus() })
  return { ok: false, error: message }
}
