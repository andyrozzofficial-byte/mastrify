"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  BETA_IMPROVEMENT_OPTIONS,
  BETA_LIKED_FEATURE_OPTIONS,
} from "../../../lib/betaFeedbackChipOptions"
import { isBetaFeedbackEnabled } from "../../../lib/betaFeedbackFeature"
import {
  readPostMasterFeedbackStatus,
  writePostMasterFeedbackStatus,
} from "../../../lib/betaPostMasterStorage"
import { BETA_WOULD_USE_AGAIN_OPTIONS } from "../../../lib/betaPostMasterFeedbackTypes"
import type { BetaFeedbackSessionAnalytics } from "../../../lib/betaFeedbackTypes"
import BetaFeedbackChipSelect from "./BetaFeedbackChipSelect"
import BetaFeedbackOptionalNotes from "./BetaFeedbackOptionalNotes"

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
  const [likedFeatures, setLikedFeatures] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])
  const [optionalComment, setOptionalComment] = useState("")
  const [wouldUseAgain, setWouldUseAgain] = useState<string>("Yes")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submitLockRef = useRef(false)

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
    if (submitLockRef.current || submitting) return
    if (readPostMasterFeedbackStatus(sessionId) === "submitted") {
      dismiss("submitted")
      return
    }
    if (likedFeatures.length === 0 || improvements.length === 0) {
      setError("Select at least one option in each section.")
      return
    }
    submitLockRef.current = true
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
          likedFeatures,
          improvements,
          optionalComment: optionalComment.trim(),
          wouldUseAgain,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Could not send feedback.")
        return
      }
      writePostMasterFeedbackStatus(sessionId, "submitted")
      dismiss("submitted")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }, [
    dismiss,
    improvements,
    submitting,
    likedFeatures,
    masterObjectKey,
    masterRating,
    optionalComment,
    sessionAnalytics,
    sessionId,
    wouldUseAgain,
  ])

  if (!show) return null

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="product-form-column mx-auto mb-6 w-full"
      aria-labelledby="beta-post-master-title"
    >
      <div className="product-surface-card overflow-hidden border-violet-400/22 p-4 sm:p-5">
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

        <div className="mt-5 space-y-5">
          <BetaFeedbackChipSelect
            label="What sounded good?"
            options={BETA_LIKED_FEATURE_OPTIONS}
            selected={likedFeatures}
            onChange={setLikedFeatures}
          />

          <BetaFeedbackChipSelect
            label="What could improve?"
            options={BETA_IMPROVEMENT_OPTIONS}
            selected={improvements}
            onChange={setImprovements}
          />

          <fieldset>
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
        </div>

        <BetaFeedbackOptionalNotes value={optionalComment} onChange={setOptionalComment} />

        {error ? (
          <p className="mt-4 text-xs text-rose-300/90" role="alert">
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
