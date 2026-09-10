export const ADMIN_ROLES = ["owner", "admin", "support"] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const ADMIN_ROLE_COOKIE = "mastrify_admin_role"

export function isAdminRole(v: string): v is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(v)
}

export function defaultAdminRole(): AdminRole {
  const raw = process.env.MASTRIFY_ADMIN_ROLE?.trim().toLowerCase()
  return raw && isAdminRole(raw) ? raw : "owner"
}

/** Route prefixes allowed per role (Settings = owner only). */
export function roleCanAccessPath(role: AdminRole, pathname: string): boolean {
  if (pathname.startsWith("/admin/settings")) return role === "owner"
  if (pathname.startsWith("/admin/analytics") || pathname.startsWith("/admin/jobs")) {
    return role === "owner" || role === "admin"
  }
  return pathname.startsWith("/admin")
}

export function roleCanAccessApi(role: AdminRole, path: string): boolean {
  if (path.startsWith("/api/admin/settings")) return role === "owner"
  if (path.startsWith("/api/admin/analytics") || path.startsWith("/api/admin/jobs")) {
    return role === "owner" || role === "admin"
  }
  return path.startsWith("/api/admin")
}
