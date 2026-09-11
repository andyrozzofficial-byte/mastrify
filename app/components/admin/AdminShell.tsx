"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { AdminNavBadges, AdminOverview } from "../../../lib/adminTypes"
import type { AdminRole } from "../../../lib/adminRoles"
import { perfTimeEnd, perfTimeStart } from "../../../lib/perfDebug"
import { ADMIN_NAV, AdminNavLink } from "./admin-shared"
import "./admin-mobile.css"

type Props = { children: React.ReactNode }

const defaultBadges: AdminNavBadges = { feedback: 0, support: 0 }

const AdminBadgeContext = createContext<AdminNavBadges>(defaultBadges)

type AdminOverviewContextValue = {
  overview: AdminOverview | null
  overviewLoading: boolean
  overviewError: string | null
}

const AdminOverviewContext = createContext<AdminOverviewContextValue>({
  overview: null,
  overviewLoading: true,
  overviewError: null,
})

export function useAdminBadges() {
  return useContext(AdminBadgeContext)
}

export function useAdminOverview() {
  return useContext(AdminOverviewContext)
}

export default function AdminShell({ children }: Props) {
  const pathname = usePathname()
  const isAdminLoginRoute = pathname === "/admin/login"
  const router = useRouter()
  const [auth, setAuth] = useState<"loading" | "login" | "ready">("loading")
  const [role, setRole] = useState<AdminRole | null>(null)
  const [badges, setBadges] = useState<AdminNavBadges>(defaultBadges)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [mobileNav, setMobileNav] = useState(false)

  const closeMobileNav = useCallback(() => setMobileNav(false), [])

  const checkAuth = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(null)
    try {
      perfTimeStart("admin-shell-auth")
      const me = await fetch("/api/admin/me", { cache: "no-store" })
      if (me.status === 401) {
        setAuth("login")
        return
      }
      const meJson = await me.json().catch(() => null)
      if (!me.ok) {
        setAuth("login")
        return
      }
      if (meJson?.role) setRole(meJson.role as AdminRole)

      perfTimeStart("admin-shell-badges")
      const badgesRes = await fetch("/api/admin/badges", { cache: "no-store" })
      perfTimeEnd("admin-shell-badges")
      if (badgesRes.ok) {
        const badgesJson = (await badgesRes.json().catch(() => null)) as {
          badges?: { feedback: number; support: number }
        } | null
        if (badgesJson?.badges) {
          setBadges({
            feedback: badgesJson.badges.feedback,
            support: badgesJson.badges.support,
          })
        }
      }

      perfTimeStart("admin-shell-overview")
      const res = await fetch("/api/admin/overview", { cache: "no-store" })
      perfTimeEnd("admin-shell-overview")
      if (!res.ok) {
        setOverviewError((await res.json().catch(() => null))?.error ?? "Could not load overview")
        setAuth("ready")
        return
      }
      const json = (await res.json()) as AdminOverview
      if (json.badges) setBadges(json.badges)
      setOverview(json)
      setAuth("ready")
    } catch {
      setAuth("login")
    } finally {
      setOverviewLoading(false)
      perfTimeEnd("admin-shell-auth")
    }
  }, [])

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (auth !== "login" || isAdminLoginRoute) return
    const next = pathname?.startsWith("/admin") ? pathname : "/admin"
    router.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [auth, isAdminLoginRoute, pathname, router])

  useEffect(() => {
    closeMobileNav()
  }, [pathname, closeMobileNav])

  useEffect(() => {
    if (!mobileNav) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNav])

  const overviewCtx = useMemo(
    () => ({ overview, overviewLoading, overviewError }),
    [overview, overviewLoading, overviewError],
  )

  if (isAdminLoginRoute) {
    return <>{children}</>
  }

  if (auth === "loading" || auth === "login") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0F0F16] text-white/60">
        {auth === "loading" ? "Loading workspace…" : "Redirecting to login…"}
      </div>
    )
  }

  return (
    <AdminOverviewContext.Provider value={overviewCtx}>
    <AdminBadgeContext.Provider value={badges}>
      <div className="admin-shell min-h-[100dvh] bg-[#0F0F16] text-white">
        <header className="sticky top-0 z-50 border-b border-white/[0.12] bg-[#0F0F16]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-expanded={mobileNav}
                aria-label={mobileNav ? "Close menu" : "Open menu"}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/20 bg-transparent px-3 text-xs font-semibold text-white transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10 lg:hidden"
                onClick={() => setMobileNav((v) => !v)}
              >
                {mobileNav ? "Close" : "Menu"}
              </button>
              <Link href="/admin" className="flex items-center gap-2" onClick={closeMobileNav}>
                <span className="text-base font-semibold tracking-tight text-white">Mastrify</span>
                <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-200 ring-1 ring-violet-400/25">
                  Admin
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {role ? (
                <span className="hidden rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/50 ring-1 ring-white/[0.08] sm:inline">
                  {role}
                </span>
              ) : null}
              <Link
                href="/master"
                className="inline-flex min-h-[44px] items-center text-xs font-medium text-violet-300 transition hover:text-violet-200"
              >
                Open app →
              </Link>
            </div>
          </div>
        </header>

        <div className="admin-shell-body relative mx-auto flex max-w-[1400px] lg:gap-8 lg:px-8 lg:py-8">
          {mobileNav ? (
            <button
              type="button"
              className="admin-drawer-backdrop fixed inset-0 z-40 bg-black/60 lg:hidden"
              aria-label="Close navigation"
              onClick={closeMobileNav}
            />
          ) : null}

          <aside
            className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[320px] flex-col border-r border-white/[0.12] bg-[#12121a] p-3 transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-60 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:border-0 lg:bg-transparent lg:p-0 ${
              mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}
          >
            <nav className="flex-1 space-y-1 overflow-y-auto rounded-2xl border border-white/[0.12] bg-white/[0.04] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.35)] lg:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              {ADMIN_NAV.map((item) => (
                <AdminNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  exact={"exact" in item ? item.exact : false}
                  pathname={pathname}
                  onNavigate={closeMobileNav}
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

          <main className="admin-main min-w-0 flex-1 overflow-x-hidden py-4 pb-[max(3rem,env(safe-area-inset-bottom))] lg:py-0 lg:pb-12">
            {children}
          </main>
        </div>
      </div>
    </AdminBadgeContext.Provider>
    </AdminOverviewContext.Provider>
  )
}
