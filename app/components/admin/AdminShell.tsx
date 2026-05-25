"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { AdminRole } from "../../../lib/adminRoles"
import { ADMIN_NAV, AdminNavLink } from "./admin-shared"

type Props = { children: React.ReactNode }

export default function AdminShell({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [auth, setAuth] = useState<"loading" | "login" | "ready">("loading")
  const [role, setRole] = useState<AdminRole | null>(null)
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] text-white/50">
        {auth === "loading" ? "Loading admin…" : "Redirecting to login…"}
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#050508] text-white">
      <div className="border-b border-white/[0.06] bg-[#090912]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-white/[0.08] px-2.5 py-2 text-xs text-white/70 lg:hidden"
              onClick={() => setMobileNav((v) => !v)}
            >
              Menu
            </button>
            <Link href="/admin" className="text-sm font-semibold tracking-tight text-white">
              Mastrify <span className="text-violet-300/80">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {role ? (
              <span className="hidden text-[10px] uppercase tracking-wide text-violet-300/70 sm:inline">
                {role}
              </span>
            ) : null}
            <Link href="/master" className="text-xs text-white/45 hover:text-white/70">
              Open app →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside
          className={`lg:w-52 lg:shrink-0 ${mobileNav ? "block" : "hidden lg:block"}`}
        >
          <nav className="space-y-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
            {ADMIN_NAV.map((item) => (
              <AdminNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                exact={"exact" in item ? item.exact : false}
                pathname={pathname}
              />
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
