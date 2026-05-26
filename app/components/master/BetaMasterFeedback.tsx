"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  buildBetaFeedbackPayloadFromResultForm,
  BETA_CLARITY_OPTIONS,
  BETA_LOUDNESS_OPTIONS,
  BETA_LOW_END_OPTIONS,
  BETA_RESULT_DAW_OPTIONS,
  BETA_RESULT_GENRE_OPTIONS,
  BETA_STEREO_OPTIONS,
} from "../../../lib/betaFeedbackSimplifiedForm"
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

const textareaClass =
  "mt-3 w-full resize-y rounded-xl border border-white/[0.08] bg-black/35 px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/32 focus:border-violet-400/35 focus:ring-2 focus:ring-violet-500/15"

type Props = {
  visible: boolean
  masterObjectKey?: string | null
  sessionAnalytics: BetaFeedbackSessionAnalytics
  onDismiss?: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/55">{children}</p>
  )
}

function RadioRow({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

function PillChoice({
  options,
  value,
  onChange,
}: {
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition sm:px-5 sm:py-3 sm:text-[14px] ${
            value === opt
              ? "border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-indigo-700/90 text-white shadow-[0_0_16px_rgba(99,102,241,0.15)]"
              : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
          }`}
        >
          {opt}
        </button>
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
  const [wouldUseAgain, setWouldUseAgain] = useState("")
  const [role, setRole] = useState("")
  const [genre, setGenre] = useState("")
  const [daw, setDaw] = useState("")
  const [loudness, setLoudness] = useState("")
  const [lowEnd, setLowEnd] = useState("")
  const [stereoImage, setStereoImage] = useState("")
  const [clarity, setClarity] = useState("")
  const [extraComments, setExtraComments] = useState("")
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
        if (g) {
          const match = BETA_RESULT_GENRE_OPTIONS.find((o) => o.value === g)
          setGenre(match?.value ?? "Other")
        }
        const d = json?.profile?.daw as string | undefined
        if (d) {
          const dawMatch = BETA_RESULT_DAW_OPTIONS.find((o) => o.value === d)
          setDaw(dawMatch?.value ?? "Other")
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
    if (!wouldUseAgain) {
      setError("Please choose whether you would use Mastrify again.")
      return
    }
    if (!role) {
      setError("Please select which best describes you.")
      return
    }
    if (!genre) {
      setError("Please select the genre you tested with.")
      return
    }
    if (!daw) {
      setError("Please select your DAW.")
      return
    }
    if (!loudness || !lowEnd || !stereoImage || !clarity) {
      setError("Please answer all mastering experience questions.")
      return
    }

    setSubmitting(true)
    setError("")

    const payload = buildBetaFeedbackPayloadFromResultForm({
      masterRating,
      soundedGood,
      couldImprove,
      wouldUseAgain: wouldUseAgain as (typeof BETA_FEEDBACK_WOULD_RELEASE_OPTIONS)[number],
      role,
      genre,
      daw,
      loudness: loudness as (typeof BETA_LOUDNESS_OPTIONS)[number],
      lowEnd: lowEnd as (typeof BETA_LOW_END_OPTIONS)[number],
      stereoImage: stereoImage as (typeof BETA_STEREO_OPTIONS)[number],
      clarity: clarity as (typeof BETA_CLARITY_OPTIONS)[number],
      extraComments,
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
    clarity,
    contactEmail,
    couldImprove,
    daw,
    dismiss,
    extraComments,
    genre,
    loudness,
    lowEnd,
    masterObjectKey,
    masterRating,
    role,
    sessionAnalytics,
    soundedGood,
    stereoImage,
    wouldUseAgain,
  ])

  if (!show) return null

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mx-auto mt-8 w-full max-w-2xl px-4 sm:mt-10 sm:px-0"
      aria-labelledby="beta-master-feedback-title"
    >
      <div className="overflow-hidden rounded-[1.35rem] border border-violet-400/20 bg-white/[0.04] p-5 shadow-[0_0_48px_rgba(124,58,237,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-8 sm:pb-9">
        <p
          id="beta-master-feedback-title"
          className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/65"
        >
          Beta feedback
        </p>

        <div className="mt-8">
          <h3 className="text-center text-lg font-semibold text-white sm:text-xl">
            <span aria-hidden>⭐ </span>
            Rate your master (1–10)
          </h3>
          <div className="mt-6 flex items-center gap-4 px-2">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={masterRating}
              onChange={(e) => setMasterRating(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-500"
              aria-label="Master rating"
            />
            <span className="w-11 text-center font-mono text-xl font-semibold text-violet-200">{masterRating}</span>
          </div>
        </div>

        <label className="mt-10 block">
          <span className="text-[15px] font-medium text-white/88">What sounded good?</span>
          <textarea
            value={soundedGood}
            onChange={(e) => setSoundedGood(e.target.value)}
            rows={4}
            placeholder="Punch, clarity, stereo width, low-end, dynamics, etc."
            className={textareaClass}
          />
        </label>

        <label className="mt-8 block">
          <span className="text-[15px] font-medium text-white/88">What could improve?</span>
          <textarea
            value={couldImprove}
            onChange={(e) => setCouldImprove(e.target.value)}
            rows={4}
            placeholder="Too bright, too compressed, more width, stronger low-end, etc."
            className={textareaClass}
          />
        </label>

        <fieldset className="mt-10">
          <legend className="text-center text-[15px] font-medium text-white/88">Would you use Mastrify again?</legend>
          <PillChoice
            options={BETA_FEEDBACK_WOULD_RELEASE_OPTIONS}
            value={wouldUseAgain}
            onChange={setWouldUseAgain}
          />
        </fieldset>

        <div className="mt-12 space-y-10 border-t border-white/[0.08] pt-10">
          <div>
            <SectionTitle>About you</SectionTitle>
            <p className="mt-3 text-[15px] font-medium text-white/80">Which best describes you?</p>
            <RadioRow name="beta-role" options={BETA_FEEDBACK_ROLE_OPTIONS} value={role} onChange={setRole} />
          </div>

          <div>
            <SectionTitle>Session information</SectionTitle>
            <p className="mt-4 text-[15px] font-medium text-white/80">What genre did you test with?</p>
            <RadioRow
              name="beta-genre"
              options={BETA_RESULT_GENRE_OPTIONS.map((o) => o.label)}
              value={BETA_RESULT_GENRE_OPTIONS.find((o) => o.value === genre)?.label ?? ""}
              onChange={(label) => {
                const match = BETA_RESULT_GENRE_OPTIONS.find((o) => o.label === label)
                setGenre(match?.value ?? "Other")
              }}
            />
            <p className="mt-8 text-[15px] font-medium text-white/80">Which DAW do you use?</p>
            <RadioRow
              name="beta-daw"
              options={BETA_RESULT_DAW_OPTIONS.map((o) => o.label)}
              value={BETA_RESULT_DAW_OPTIONS.find((o) => o.value === daw)?.label ?? ""}
              onChange={(label) => {
                const byLabel = BETA_RESULT_DAW_OPTIONS.find((o) => o.label === label)
                setDaw(byLabel?.value ?? "Other")
              }}
            />
          </div>

          <div>
            <SectionTitle>Mastering experience</SectionTitle>
            <p className="mt-4 text-[15px] font-medium text-white/80">How would you rate loudness?</p>
            <RadioRow name="beta-loudness" options={BETA_LOUDNESS_OPTIONS} value={loudness} onChange={setLoudness} />
            <p className="mt-8 text-[15px] font-medium text-white/80">How would you rate low-end?</p>
            <RadioRow name="beta-lowend" options={BETA_LOW_END_OPTIONS} value={lowEnd} onChange={setLowEnd} />
            <p className="mt-8 text-[15px] font-medium text-white/80">How would you rate stereo image?</p>
            <RadioRow name="beta-stereo" options={BETA_STEREO_OPTIONS} value={stereoImage} onChange={setStereoImage} />
            <p className="mt-8 text-[15px] font-medium text-white/80">How would you rate clarity?</p>
            <RadioRow name="beta-clarity" options={BETA_CLARITY_OPTIONS} value={clarity} onChange={setClarity} />
          </div>

          <div>
            <SectionTitle>Additional comments</SectionTitle>
            <label className="mt-4 block">
              <span className="text-[15px] font-medium text-white/80">
                Anything else you&apos;d like us to improve?
              </span>
              <textarea
                value={extraComments}
                onChange={(e) => setExtraComments(e.target.value)}
                rows={4}
                placeholder="Optional — features, workflow, pricing, etc."
                className={textareaClass}
              />
            </label>
          </div>
        </div>

        {error ? (
          <p className="mt-8 text-center text-sm text-rose-300/90" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.08] pt-8 sm:flex-row">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-6 text-[15px] font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.16)] transition hover:brightness-[1.06] disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => dismiss("skipped")}
            className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 text-[15px] font-semibold text-white/65 transition hover:bg-white/[0.06] disabled:opacity-50 sm:min-w-[7rem]"
          >
            Skip
          </button>
        </div>
      </div>
    </motion.section>
  )
}
