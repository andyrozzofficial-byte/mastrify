"use client"

import Link from "next/link"
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
      className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 text-white sm:px-6 sm:py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />

      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,rgba(99,102,241,0.16),transparent_62%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[18%] h-[min(420px,55vh)] w-[min(560px,88vw)] -translate-x-1/2 rounded-full bg-violet-600/[0.08] blur-[100px]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.4, 0.65, 0.4], scale: [1, 1.04, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_100%,rgba(0,0,0,0.55),transparent_45%)]"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-[24rem] flex-col items-center">
        <Link
          href="/landing"
          className="mb-10 bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text text-xl font-bold tracking-tight text-transparent drop-shadow-[0_0_14px_rgba(139,92,246,0.22)] sm:mb-12"
        >
          Mastrify
        </Link>

        <motion.div
          className="relative w-full"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-[1.4rem] bg-gradient-to-br from-violet-500/22 via-transparent to-cyan-500/12 opacity-70 blur-md"
            aria-hidden
          />

          <motion.div
            className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-black/[0.82] px-7 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_0_0_1px_rgba(167,139,250,0.12),0_28px_64px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:px-8 sm:py-10"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/32 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-600/[0.09] blur-3xl"
              aria-hidden
            />

            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/72">
              Private beta
            </p>
            <h1 className="mt-5 text-center text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white/95 sm:text-[1.65rem]">
              You&apos;re invited
            </h1>
            <p className="mx-auto mt-4 max-w-[16.5rem] text-center text-[14px] leading-[1.65] text-muted sm:text-[15px] sm:leading-[1.7]">
              Enter the shared access password to open mastering. Public pages stay available without a login.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="sr-only">Access password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Access password"
                  required
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-[15px] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition duration-300 placeholder:text-muted-soft focus:border-violet-400/35 focus:bg-white/[0.06] focus:shadow-[0_0_0_1px_rgba(167,139,250,0.15),0_0_28px_rgba(99,102,241,0.1)]"
                />
              </label>

              {error ? (
                <p className="text-center text-[13px] leading-relaxed text-rose-300/88" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="group relative mx-auto flex min-h-[50px] w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-8 text-[14px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_36px_rgba(0,0,0,0.38),0_0_24px_rgba(99,102,241,0.12)] ring-1 ring-white/[0.1] transition-all duration-300 hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-none sm:min-w-[13.5rem]"
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
                  aria-hidden
                />
                <span className="relative z-[1]">{loading ? "Checking…" : "Continue"}</span>
              </button>
            </form>
          </motion.div>
        </motion.div>

        <p className="mt-10 max-w-[18rem] text-center text-[11px] leading-relaxed tracking-[0.02em] text-muted-faint sm:mt-12">
          Need access? Contact{" "}
          <a
            href="mailto:hello@mastrify.com"
            className="text-label transition hover:text-violet-200/75"
          >
            hello@mastrify.com
          </a>
          .
        </p>
      </div>
    </motion.div>
  )
}
