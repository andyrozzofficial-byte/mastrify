"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FormEvent, useCallback, useEffect, useState } from "react"
import { ADMIN_NAV, AdminNavLink } from "./admin-shared"

type Props = { children: React.ReactNode }

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError("Incorrect password.")
        return
      }
      onSuccess()
    } catch {
      setError("Could not sign in.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#090912] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">Mastrify Admin</p>
        <h1 className="mt-2 text-xl font-semibold text-white">Secure login</h1>
        <p className="mt-2 text-sm text-white/55">Internal dashboard — authorized team only.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/40"
          />
          {error ? <p className="text-xs text-rose-300/90">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link href="/" className="mt-4 block text-center text-xs text-white/40 hover:text-white/60">
          ← Back to Mastrify
        </Link>
      </div>
    </div>
  )
}

export default function AdminShell({ children }: Props) {
  const pathname = usePathname()
  const [auth, setAuth] = useState<"loading" | "login" | "ready">("loading")
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
      setAuth("ready")
    } catch {
      setAuth("login")
    }
  }, [])

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  if (auth === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] text-white/50">
        Loading admin…
      </div>
    )
  }

  if (auth === "login") {
    return <AdminLogin onSuccess={() => void checkAuth()} />
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
          <Link href="/master" className="text-xs text-white/45 hover:text-white/70">
            Open app →
          </Link>
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
