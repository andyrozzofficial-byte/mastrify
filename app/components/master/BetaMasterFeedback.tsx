"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { buildBetaFeedbackPayloadFromSimplified, BETA_RESULT_GENRE_OPTIONS } from "../../../lib/betaFeedbackSimplifiedForm"
import { isBetaFeedbackEnabled } from "../../../lib/betaFeedbackFeature"
import { writeBetaFeedbackStatus } from "../../../lib/betaFeedbackStorage"
import {
  readPostMasterFeedbackStatus,
  writePostMasterFeedbackStatus,
} from "../../../lib/betaPostMasterStorage"
import {
  BETA_FEEDBACK_ROLE_OPTIONS,
  BETA_FEEDBACK_WOULD_RELEASE_OPTIONS,
  type BetaFeedbackSessionAnalytics,
} from "../../../lib/betaFeedbackTypes"

const EASE = [0.22, 1, 0.36, 1] as const

const REWARDS = [
  "1 master + feedback → 10% discount",
  "5 masters + feedback → 25% discount",
  "Top contributors → Insider status + future rewards",
] as const

type Props = {
  visible: boolean
  masterObjectKey?: string | null
  sessionAnalytics: BetaFeedbackSessionAnalytics
  onDismiss?: () => void
}

function RadioRow({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  columns?: 1 | 2
}) {
  return (
    <div className={`mt-3 grid gap-2 ${columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-[14px] transition ${
            value === opt
              ? "border-violet-400/35 bg-violet-500/10 text-white"
              : "border-white/[0.08] bg-white/[0.02] text-white/72 hover:border-white/[0.12] hover:bg-white/[0.04]"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="h-4 w-4 shrink-0 accent-violet-500"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  )
}

export default function BetaMasterFeedback({
  visible,
  masterObjectKey,
  sessionAnalytics,
  onDismiss,
}: Props) {
  const reduce = useReducedMotion()
  const sessionId = sessionAnalytics.sessionId

  const [show, setShow] = useState(false)
  const [masterRating, setMasterRating] = useState(8)
  const [soundedGood, setSoundedGood] = useState("")
  const [couldImprove, setCouldImprove] = useState("")
  const [wouldUseAgain, setWouldUseAgain] = useState<string>("Yes")
  const [role, setRole] = useState("")
  const [genre, setGenre] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible || !isBetaFeedbackEnabled()) {
      setShow(false)
      return
    }
    if (readPostMasterFeedbackStatus(sessionId)) {
      setShow(false)
      return
    }
    const t = window.setTimeout(() => setShow(true), 500)
    return () => window.clearTimeout(t)
  }, [visible, sessionId])

  useEffect(() => {
    if (!show) return
    void (async () => {
      try {
        const res = await fetch("/api/beta/profile", { cache: "no-store", credentials: "include" })
        const json = await res.json().catch(() => null)
        if (json?.email) setContactEmail(json.email)
        const g = json?.profile?.genre as string | undefined
        if (g && BETA_RESULT_GENRE_OPTIONS.some((o) => o.value === g)) {
          setGenre(g)
        } else if (g) {
          setGenre("Other")
        }
      } catch {
        /* optional prefill */
      }
    })()
  }, [show])

  const dismiss = useCallback(
    (status: "skipped" | "submitted") => {
      writePostMasterFeedbackStatus(sessionId, status)
      if (status === "skipped") writeBetaFeedbackStatus("skipped")
      setShow(false)
      onDismiss?.()
    },
    [sessionId, onDismiss],
  )

  const handleSubmit = useCallback(async () => {
    if (!soundedGood.trim() || !couldImprove.trim()) {
      setError("Please share what sounded good and what could improve.")
      return
    }
    if (!role) {
      setError("Please select your role.")
      return
    }
    if (!genre) {
      setError("Please select the genre you tested.")
      return
    }
    if (
      !BETA_FEEDBACK_WOULD_RELEASE_OPTIONS.includes(
        wouldUseAgain as (typeof BETA_FEEDBACK_WOULD_RELEASE_OPTIONS)[number],
      )
    ) {
      setError("Please choose whether you would use Mastrify again.")
      return
    }

    setSubmitting(true)
    setError("")

    const payload = buildBetaFeedbackPayloadFromSimplified({
      masterRating,
      soundedGood,
      couldImprove,
      wouldUseAgain: wouldUseAgain as (typeof BETA_FEEDBACK_WOULD_RELEASE_OPTIONS)[number],
      role,
      genre,
      masterObjectKey: masterObjectKey ?? null,
      sessionAnalytics,
      contactEmail,
    })

    try {
      const res = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Could not send feedback.")
        return
      }
      writeBetaFeedbackStatus("submitted")
      dismiss("submitted")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }, [
    couldImprove,
    contactEmail,
    dismiss,
    genre,
    masterObjectKey,
    masterRating,
    role,
    sessionAnalytics,
    soundedGood,
    wouldUseAgain,
  ])

  if (!show) return null

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mx-auto mt-8 w-full max-w-xl px-4 sm:mt-10 sm:px-0"
      aria-labelledby="beta-master-feedback-title"
    >
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/75">Private beta</p>
        <h2 id="beta-master-feedback-title" className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-[1.35rem]">
          Help shape Mastrify
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-white/60">
          You&apos;re testing early access to Mastrify. Every master, rating and feedback submission helps improve the
          engine.
        </p>
        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left">
          <p className="text-[11px] font-medium text-white/70">Beta rewards</p>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-white/65">
            {REWARDS.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-white/35" aria-hidden>
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-violet-400/20 bg-white/[0.04] p-5 shadow-[0_0_40px_rgba(124,58,237,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-7">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/60">
          Beta feedback
        </p>

        <div className="mt-6">
          <h3 className="text-center text-[17px] font-semibold text-white">
            <span aria-hidden>⭐ </span>
            Rate your master (1–10)
          </h3>
          <div className="mt-5 flex items-center gap-4 px-1">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={masterRating}
              onChange={(e) => setMasterRating(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-500"
              aria-label="Master rating"
            />
            <span className="w-10 text-center font-mono text-lg font-semibold text-violet-200">{masterRating}</span>
          </div>
        </div>

        <label className="mt-8 block">
          <span className="text-[14px] font-medium text-white/85">What sounded good?</span>
          <textarea
            value={soundedGood}
            onChange={(e) => setSoundedGood(e.target.value)}
            rows={3}
            placeholder="Punch, clarity, stereo width, low-end, etc."
            className="mt-3 w-full resize-y rounded-xl border border-white/[0.08] bg-black/35 px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/32 focus:border-violet-400/35 focus:ring-2 focus:ring-violet-500/15"
          />
        </label>

        <label className="mt-6 block">
          <span className="text-[14px] font-medium text-white/85">What could improve?</span>
          <textarea
            value={couldImprove}
            onChange={(e) => setCouldImprove(e.target.value)}
            rows={3}
            placeholder="Too bright, too much compression, more width, etc."
            className="mt-3 w-full resize-y rounded-xl border border-white/[0.08] bg-black/35 px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/32 focus:border-violet-400/35 focus:ring-2 focus:ring-violet-500/15"
          />
        </label>

        <fieldset className="mt-8">
          <legend className="text-center text-[14px] font-medium text-white/85">Would you use Mastrify again?</legend>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {BETA_FEEDBACK_WOULD_RELEASE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setWouldUseAgain(opt)}
                className={`min-w-[5.5rem] rounded-xl border px-5 py-3 text-[14px] font-semibold transition ${
                  wouldUseAgain === opt
                    ? "border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-indigo-700/90 text-white shadow-[0_0_16px_rgba(99,102,241,0.15)]"
                    : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-10 border-t border-white/[0.08] pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">About this session</p>

          <div className="mt-5">
            <p className="text-[13px] font-medium text-white/75">Role</p>
            <RadioRow name="beta-role" options={BETA_FEEDBACK_ROLE_OPTIONS} value={role} onChange={setRole} />
          </div>

          <div className="mt-6">
            <p className="text-[13px] font-medium text-white/75">Genre tested</p>
            <RadioRow
              name="beta-genre"
              options={BETA_RESULT_GENRE_OPTIONS.map((o) => o.label)}
              value={BETA_RESULT_GENRE_OPTIONS.find((o) => o.value === genre)?.label ?? ""}
              onChange={(label) => {
                const match = BETA_RESULT_GENRE_OPTIONS.find((o) => o.label === label)
                setGenre(match?.value ?? "Other")
              }}
              columns={2}
            />
          </div>
        </div>

        {error ? (
          <p className="mt-6 text-center text-sm text-rose-300/90" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-5 text-[15px] font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.14)] transition hover:brightness-[1.06] disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => dismiss("skipped")}
            className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-[15px] font-semibold text-white/70 transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </motion.section>
  )
}
