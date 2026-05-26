"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { isBetaFeedbackEnabled } from "../../../lib/betaFeedbackFeature"
import {
  readPostMasterFeedbackStatus,
  writePostMasterFeedbackStatus,
} from "../../../lib/betaPostMasterStorage"
import { BETA_WOULD_USE_AGAIN_OPTIONS } from "../../../lib/betaPostMasterFeedbackTypes"
import type { BetaFeedbackSessionAnalytics } from "../../../lib/betaFeedbackTypes"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  visible: boolean
  masterObjectKey?: string | null
  sessionAnalytics: BetaFeedbackSessionAnalytics
  onDismiss?: () => void
}

export default function BetaPostMasterFeedback({
  visible,
  masterObjectKey,
  sessionAnalytics,
  onDismiss,
}: Props) {
  const reduce = useReducedMotion()
  const [show, setShow] = useState(false)
  const [masterRating, setMasterRating] = useState(8)
  const [soundedGood, setSoundedGood] = useState("")
  const [couldImprove, setCouldImprove] = useState("")
  const [wouldUseAgain, setWouldUseAgain] = useState<string>("Yes")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const sessionId = sessionAnalytics.sessionId

  useEffect(() => {
    if (!visible || !isBetaFeedbackEnabled()) {
      setShow(false)
      return
    }
    const status = readPostMasterFeedbackStatus(sessionId)
    if (status) {
      setShow(false)
      return
    }
    const t = window.setTimeout(() => setShow(true), 800)
    return () => window.clearTimeout(t)
  }, [visible, sessionId])

  const dismiss = useCallback(
    (status: "skipped" | "submitted") => {
      writePostMasterFeedbackStatus(sessionId, status)
      setShow(false)
      onDismiss?.()
    },
    [sessionId, onDismiss],
  )

  const handleSubmit = useCallback(async () => {
    if (!soundedGood.trim() || !couldImprove.trim()) {
      setError("Please answer all three questions.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/beta-feedback/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          trackName: sessionAnalytics.trackName,
          masteringStyle: sessionAnalytics.masteringStyle,
          masterObjectKey: masterObjectKey ?? null,
          trackDuration: sessionAnalytics.trackDuration,
          stereoWidth: sessionAnalytics.stereoWidth,
          lowEnd: sessionAnalytics.lowEnd,
          masterLufs: sessionAnalytics.masterLufs,
          processingTimeMs: sessionAnalytics.processingTimeMs,
          masterRating,
          soundedGood: soundedGood.trim(),
          couldImprove: couldImprove.trim(),
          wouldUseAgain,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Could not send feedback.")
        return
      }
      dismiss("submitted")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }, [
    couldImprove,
    dismiss,
    masterObjectKey,
    masterRating,
    sessionAnalytics,
    sessionId,
    soundedGood,
    wouldUseAgain,
  ])

  if (!show) return null

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto mb-6 w-full max-w-lg px-4 sm:px-0"
      aria-labelledby="beta-post-master-title"
    >
      <div className="overflow-hidden rounded-2xl border border-violet-400/22 bg-white/[0.04] p-4 shadow-[0_0_32px_rgba(124,58,237,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/65">Beta feedback</p>
        <h2 id="beta-post-master-title" className="mt-2 text-lg font-semibold text-white">
          <span aria-hidden>⭐ </span>
          Rate your master (1–10)
        </h2>

        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={masterRating}
            onChange={(e) => setMasterRating(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-500"
            aria-label="Master rating"
          />
          <span className="w-8 text-center font-mono text-sm font-semibold text-violet-200">{masterRating}</span>
        </div>

        <label className="mt-4 block">
          <span className="text-[12px] font-medium text-white/80">What sounded good?</span>
          <textarea
            value={soundedGood}
            onChange={(e) => setSoundedGood(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/32 focus:border-violet-400/35"
            placeholder="Punch, clarity, low end…"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[12px] font-medium text-white/80">What could improve?</span>
          <textarea
            value={couldImprove}
            onChange={(e) => setCouldImprove(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/32 focus:border-violet-400/35"
            placeholder="Too bright, more width, etc."
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-[12px] font-medium text-white/80">Would you use Mastrify again?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {BETA_WOULD_USE_AGAIN_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setWouldUseAgain(opt)}
                className={`rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                  wouldUseAgain === opt
                    ? "border-violet-400/40 bg-violet-500/15 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-white/65 hover:bg-white/[0.05]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="mt-3 text-xs text-rose-300/90" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-4 text-sm font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.12)] transition hover:brightness-[1.06] disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => dismiss("skipped")}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-white/76 transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </motion.section>
  )
}
