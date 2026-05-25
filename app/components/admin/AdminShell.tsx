"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { AdminNavBadges, AdminOverview } from "../../../lib/adminTypes"
import type { AdminRole } from "../../../lib/adminRoles"
import { ADMIN_NAV, AdminNavLink } from "./admin-shared"

type Props = { children: React.ReactNode }

const defaultBadges: AdminNavBadges = { feedback: 0, support: 0 }

const AdminBadgeContext = createContext<AdminNavBadges>(defaultBadges)

export function useAdminBadges() {
  return useContext(AdminBadgeContext)
}

export default function AdminShell({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [auth, setAuth] = useState<"loading" | "login" | "ready">("loading")
  const [role, setRole] = useState<AdminRole | null>(null)
  const [badges, setBadges] = useState<AdminNavBadges>(defaultBadges)
  const [mobileNav, setMobileNav] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" })
      if (res.status === 401) {
        setAuth("login")
        return
      }
      if (!res.ok) {
        setAuth("login")
        return
      }
      const json = (await res.json()) as AdminOverview
      if (json.badges) setBadges(json.badges)
      const me = await fetch("/api/admin/me", { cache: "no-store" })
      const meJson = await me.json().catch(() => null)
      if (me.ok && meJson?.role) setRole(meJson.role as AdminRole)
      setAuth("ready")
    } catch {
      setAuth("login")
    }
  }, [])

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (auth !== "login") return
    const next = pathname?.startsWith("/admin") ? pathname : "/admin"
    router.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [auth, pathname, router])

  if (auth === "loading" || auth === "login") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F5F7FA] text-slate-500">
        {auth === "loading" ? "Loading workspace…" : "Redirecting to login…"}
      </div>
    )
  }

  return (
    <AdminBadgeContext.Provider value={badges}>
      <div className="min-h-[100dvh] bg-[#F5F7FA] text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileNav((v) => !v)}
              >
                Menu
              </button>
              <Link href="/admin" className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-900">Mastrify</span>
                <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-700">
                  Admin
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {role ? (
                <span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/80 sm:inline">
                  {role}
                </span>
              ) : null}
              <Link
                href="/master"
                className="text-xs font-medium text-violet-600 transition hover:text-violet-800"
              >
                Open app →
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-8">
          <aside className={`lg:w-60 lg:shrink-0 ${mobileNav ? "block" : "hidden lg:block"}`}>
            <nav className="space-y-1 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm shadow-slate-200/50">
              {ADMIN_NAV.map((item) => (
                <AdminNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  exact={"exact" in item ? item.exact : false}
                  pathname={pathname}
                  badge={
                    item.badgeKey === "feedback"
                      ? badges.feedback
                      : item.badgeKey === "support"
                        ? badges.support
                        : undefined
                  }
                />
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 pb-12">{children}</main>
        </div>
      </div>
    </AdminBadgeContext.Provider>
  )
}
