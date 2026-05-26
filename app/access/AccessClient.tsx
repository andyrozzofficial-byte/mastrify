"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import { useBetaMasteringGateOptional } from "../components/beta/BetaMasteringGateProvider"
import { safeAccessRedirect } from "../../lib/access"
import type { BetaAccessJson } from "../../lib/betaClientAccess"
import { accessFromBetaJson } from "../../lib/betaClientAccess"
import { getStoredBetaEmail, setStoredBetaEmail } from "../../lib/betaSessionStorage"

const EASE = [0.22, 1, 0.36, 1] as const

type ProfileResponse = BetaAccessJson & {
  profile?: { name: string | null } | null
  error?: string
  profileExists?: boolean
}

type Phase = "checking" | "continue" | "join" | "magic-sent"

async function syncBetaSessionAfterSignup(
  gate: ReturnType<typeof useBetaMasteringGateOptional>,
  json: BetaAccessJson | null,
  email: string,
): Promise<void> {
  setStoredBetaEmail(email)
  gate?.applyBetaSession(json)
  await gate?.refreshAccess({ silent: true })
}

export default function AccessClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gate = useBetaMasteringGateOptional()
  const applyBetaSession = gate?.applyBetaSession
  const refreshAccess = gate?.refreshAccess
  const reduce = useReducedMotion()
  const next = safeAccessRedirect(searchParams.get("next"))
  const modeParam = searchParams.get("mode")
  const errorParam = searchParams.get("error")
  const redirectStarted = useRef(false)

  const initialPhase: Phase = modeParam === "join" ? "join" : "continue"
  const [phase, setPhase] = useState<Phase>("checking")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(() => {
    if (errorParam === "link_expired") {
      return "That sign-in link has expired. Request a new one below."
    }
    if (errorParam === "no_profile") {
      return "We could not find a beta profile for that link. Join below to get started."
    }
    return null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void (async () => {
      const goToMaster = (targetEmail?: string | null) => {
        if (redirectStarted.current) return
        redirectStarted.current = true
        if (targetEmail) setStoredBetaEmail(targetEmail)
        router.replace(next)
      }

      try {
        const res = await fetch("/api/beta/profile", { cache: "no-store", credentials: "include" })
        const json = (await res.json().catch(() => null)) as ProfileResponse | null

        if (accessFromBetaJson(json) || json?.complete) {
          if (json) applyBetaSession?.(json)
          await refreshAccess?.({ silent: true })
          goToMaster(json?.email ?? undefined)
          return
        }

        if (json?.email) setEmail(json.email)
        if (json?.profile?.name) setName(json.profile.name)

        const storedEmail = getStoredBetaEmail()
        if (storedEmail) {
          const resumeRes = await fetch("/api/beta/profile/resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: storedEmail }),
          })
          const resumeJson = (await resumeRes.json().catch(() => null)) as ProfileResponse | null
          if (accessFromBetaJson(resumeJson) || resumeJson?.complete) {
            if (resumeJson) applyBetaSession?.(resumeJson)
            await refreshAccess?.({ silent: true })
            goToMaster(resumeJson?.email ?? storedEmail)
            return
          }
          if (resumeJson?.email) setEmail(resumeJson.email)
          if (resumeJson?.profile?.name) setName(resumeJson.profile.name)
        }
      } catch {
        const storedEmail = getStoredBetaEmail()
        if (storedEmail) setEmail(storedEmail)
      } finally {
        if (!redirectStarted.current) setPhase(initialPhase)
      }
    })()
  }, [next, router, applyBetaSession, refreshAccess, initialPhase])

  async function onProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/beta/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name: name.trim() || null }),
      })
      const json = (await res.json().catch(() => null)) as ProfileResponse | null
      if (!res.ok) {
        setError(json?.error ?? "Could not save your profile.")
        return
      }

      await syncBetaSessionAfterSignup(gate, json, email)
      router.replace(next)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function onMagicLinkSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/beta/session/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        profileExists?: boolean
        error?: string
        devSignInUrl?: string
      } | null

      if (!res.ok) {
        if (json?.devSignInUrl && process.env.NODE_ENV !== "production") {
          console.info("[beta] dev sign-in URL:", json.devSignInUrl)
        }
        if (json?.profileExists === false) {
          setError("No beta profile found for this email. Join the beta to get started.")
          setPhase("join")
          return
        }
        setError(json?.error ?? "Could not send sign-in link.")
        return
      }

      setStoredBetaEmail(email)
      setPhase("magic-sent")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const checking = phase === "checking"
  const isJoin = phase === "join"
  const isMagicSent = phase === "magic-sent"

  const title = checking
    ? "Checking your beta access…"
    : isJoin
      ? "Join the beta"
      : isMagicSent
        ? "Check your email"
        : "Welcome back"

  const subtitle = checking
    ? "Please wait while we restore your session."
    : isJoin
      ? "Enter your email to start mastering. You can share more details after your first master."
      : isMagicSent
        ? `We sent a secure sign-in link to ${email || "your email"}. Open it on this device to continue where you left off.`
        : "Continue with your email — we'll send a secure link. No password needed."

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

            {checking ? (
              <div className="mt-8 flex justify-center" aria-live="polite">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-violet-400/90" />
              </div>
            ) : isMagicSent ? (
              <div className="mt-8 space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("continue")
                    setError(null)
                  }}
                  className="flex min-h-[50px] w-full items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-[14px] font-semibold text-white/88 transition hover:bg-white/[0.07]"
                >
                  Use a different email
                </button>
              </div>
            ) : isJoin ? (
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
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[15px] text-white/92 outline-none focus:border-violet-400/35"
                  />
                </label>
                {error ? (
                  <p className="text-center text-[13px] leading-relaxed text-rose-300/88" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex min-h-[50px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-violet-500/95 to-indigo-800/95 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Saving…" : "Start mastering"}
                </button>
                <p className="text-center text-[12px] text-white/42">
                  Already in the beta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("continue")
                      setError(null)
                    }}
                    className="text-violet-200/90 underline-offset-2 hover:underline"
                  >
                    Continue with email
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={onMagicLinkSubmit} className="mt-8 space-y-4">
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
                {error ? (
                  <p className="text-center text-[13px] leading-relaxed text-rose-300/88" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex min-h-[50px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-violet-500/95 to-indigo-800/95 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Sending link…" : "Continue with email"}
                </button>
                <p className="text-center text-[12px] text-white/42">
                  New to the beta?{" "}
                  <Link
                    href={`/access?mode=join${next !== "/master" ? `&next=${encodeURIComponent(next)}` : ""}`}
                    className="text-violet-200/90 underline-offset-2 hover:underline"
                  >
                    Join the beta
                  </Link>
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>

        <p className="mt-10 max-w-[18rem] text-center text-[11px] leading-relaxed tracking-[0.02em] text-muted-faint sm:mt-12">
          Questions? Contact{" "}
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
