"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import { safeAccessRedirect } from "../../lib/access"

const EASE = [0.22, 1, 0.36, 1] as const

export default function AccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduce = useReducedMotion()
  const next = safeAccessRedirect(searchParams.get("next"))

  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        setError("Incorrect password. Try again.")
        return
      }

      router.replace(next)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="relative min-h-[min(72vh,640px)] overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_35%,rgba(99,102,241,0.12),transparent_58%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-[26rem] flex-col px-5 py-16 md:py-20"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <div className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/18 via-transparent to-cyan-500/10 opacity-60 blur-sm" aria-hidden />
        <div className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.11] bg-gradient-to-b from-white/[0.05] to-black/[0.78] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(167,139,250,0.1),0_24px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:px-8 md:py-9">
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/28 to-transparent"
            aria-hidden
          />

          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.26em] text-label-strong">
            Private preview
          </p>
          <h1 className="mt-4 text-center text-[1.35rem] font-semibold tracking-[-0.03em] text-white/94 sm:text-[1.5rem]">
            Enter access password
          </h1>
          <p className="mx-auto mt-3 max-w-[15rem] text-center text-[13px] leading-relaxed text-muted">
            Mastering is in private testing. Marketing pages stay public.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="sr-only">Access password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition duration-300 placeholder:text-muted-soft focus:border-violet-400/35 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(167,139,250,0.15),0_0_24px_rgba(99,102,241,0.08)]"
              />
            </label>

            {error ? (
              <p className="text-center text-[13px] text-rose-300/85" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="group relative flex w-full min-h-[50px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-8 text-[14px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_36px_rgba(0,0,0,0.38),0_0_24px_rgba(99,102,241,0.12)] ring-1 ring-white/[0.1] transition-all duration-300 hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
                aria-hidden
              />
              <span className="relative z-[1]">{loading ? "Checking…" : "Continue"}</span>
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  )
}
