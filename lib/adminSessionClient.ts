/** Client-side admin session probe (cookie-backed; server enforces on /api/admin/*). */
export type AdminSessionClient = {
  authenticated: boolean
  role?: string
}

export async function fetchAdminSessionClient(): Promise<AdminSessionClient> {
  try {
    const res = await fetch("/api/admin/me", {
      cache: "no-store",
      credentials: "include",
    })
    const json = (await res.json().catch(() => null)) as {
      authenticated?: boolean
      role?: string
    } | null
    if (!res.ok) return { authenticated: false }
    return {
      authenticated: json?.authenticated === true,
      role: typeof json?.role === "string" ? json.role : undefined,
    }
  } catch {
    return { authenticated: false }
  }
}
