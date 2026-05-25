"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

function safeAdminNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/admin"
  if (!next.startsWith("/admin")) return "/admin"
  return next
}

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeAdminNext(searchParams.get("next"))

  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/overview", { cache: "no-store" })
        if (res.ok) {
          router.replace(nextPath)
          return
        }
      } catch {
        /* show login */
      } finally {
        setChecking(false)
      }
    })()
  }, [router, nextPath])

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
        setError("Invalid password")
        return
      }
      router.replace(nextPath)
    } catch {
      setError("Invalid password")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] text-white/50">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#141416] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#18181c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">Mastrify</p>
        <h1 className="mt-2 text-xl font-semibold text-white">Admin login</h1>
        <p className="mt-2 text-sm text-white/55">Authorized team only.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
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
