"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import { safeAccessRedirect } from "../../lib/access"
import { BETA_DAW_OPTIONS } from "../../lib/betaAccess"
import { BETA_FEEDBACK_GENRE_OPTIONS } from "../../lib/betaFeedbackTypes"

const EASE = [0.22, 1, 0.36, 1] as const

type Step = "loading" | "password" | "profile"

export default function AccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduce = useReducedMotion()
  const next = safeAccessRedirect(searchParams.get("next"))

  const [step, setStep] = useState<Step>("loading")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [genre, setGenre] = useState("")
  const [daw, setDaw] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/beta/profile", { cache: "no-store" })
        if (res.status === 401) {
          setStep("password")
          return
        }
        const json = await res.json().catch(() => null)
        if (json?.complete) {
          router.replace(next)
          return
        }
        if (json?.email) setEmail(json.email)
        if (json?.profile?.genre) setGenre(json.profile.genre)
        if (json?.profile?.daw) setDaw(json.profile.daw)
        if (json?.profile?.name) setName(json.profile.name)
        setStep(res.ok ? "profile" : "password")
      } catch {
        setStep("password")
      }
    })()
  }, [next, router])

  async function onPasswordSubmit(e: FormEvent) {
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

      const profileRes = await fetch("/api/beta/profile", { cache: "no-store" })
      const json = await profileRes.json().catch(() => null)
      if (profileRes.ok && json?.complete) {
        router.replace(next)
        router.refresh()
        return
      }
      if (json?.email) setEmail(json.email)
      setStep("profile")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function onProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/beta/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name.trim() || null, genre, daw }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not save your profile.")
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

  const title =
    step === "profile" ? "One quick step" : step === "loading" ? "Checking access…" : "You're invited"
  const subtitle =
    step === "profile"
      ? "Tell us who you are so feedback and support stay linked to your sessions."
      : step === "loading"
        ? "Please wait."
        : "Enter the shared access password to open mastering. Public pages stay available without a login."

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

            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/72">
              Private beta
            </p>
            <h1 className="mt-5 text-center text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white/95 sm:text-[1.65rem]">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-[16.5rem] text-center text-[14px] leading-[1.65] text-muted sm:text-[15px] sm:leading-[1.7]">
              {subtitle}
            </p>

            {step === "password" ? (
              <form onSubmit={onPasswordSubmit} className="mt-8 space-y-5">
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
                  className="group relative mx-auto flex min-h-[50px] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-8 text-[14px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_36px_rgba(0,0,0,0.38),0_0_24px_rgba(99,102,241,0.12)] ring-1 ring-white/[0.1] transition-all duration-300 hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-[1]">{loading ? "Checking…" : "Continue"}</span>
                </button>
              </form>
            ) : null}

            {step === "profile" ? (
              <form onSubmit={onProfileSubmit} className="mt-8 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                    Email
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[15px] text-white/92 outline-none focus:border-violet-400/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                    Name (optional)
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[15px] text-white/92 outline-none focus:border-violet-400/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                    Genre
                  </span>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[15px] text-white/92 outline-none focus:border-violet-400/35"
                  >
                    <option value="" disabled>
                      Select genre
                    </option>
                    {BETA_FEEDBACK_GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g} className="bg-[#111]">
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/45">
                    DAW
                  </span>
                  <select
                    value={daw}
                    onChange={(e) => setDaw(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[15px] text-white/92 outline-none focus:border-violet-400/35"
                  >
                    <option value="" disabled>
                      Select DAW
                    </option>
                    {BETA_DAW_OPTIONS.map((d) => (
                      <option key={d} value={d} className="bg-[#111]">
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                {error ? (
                  <p className="text-center text-[13px] leading-relaxed text-rose-300/88" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !genre || !daw}
                  className="flex min-h-[50px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-violet-500/95 to-indigo-800/95 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Saving…" : "Enter beta"}
                </button>
              </form>
            ) : null}

            {step === "loading" ? (
              <p className="mt-8 text-center text-sm text-white/45">Loading…</p>
            ) : null}
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
