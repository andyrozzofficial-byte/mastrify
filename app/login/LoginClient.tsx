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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F5F7FA] text-slate-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F5F7FA] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/50">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-600">Mastrify</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Admin login</h1>
        <p className="mt-2 text-sm text-slate-600">Authorized team only.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link href="/" className="mt-4 block text-center text-xs text-violet-600 hover:text-violet-800">
          ← Back to Mastrify
        </Link>
      </div>
    </div>
  )
}
