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
import {
  BETA_IMPROVEMENT_OPTIONS,
  BETA_LIKED_FEATURE_OPTIONS,
} from "../../../lib/betaFeedbackChipOptions"
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
import { dispatchBetaProfileRefresh } from "../../../lib/betaMasterTrackingClient"
import { useBetaMasteringGate } from "../beta/BetaMasteringGateProvider"
import BetaFeedbackChipSelect from "./BetaFeedbackChipSelect"
import BetaFeedbackOptionalNotes from "./BetaFeedbackOptionalNotes"
import BetaFeedbackSuccessPanel from "./BetaFeedbackSuccessPanel"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  visible: boolean
  masterObjectKey?: string | null
  sessionAnalytics: BetaFeedbackSessionAnalytics
  onDismiss?: () => void
  onCreateAnotherMaster?: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-violet-200/50">{children}</p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[12px] font-medium text-white/72">{children}</p>
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
    <div className="mt-1.5 grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] transition sm:text-[13px] ${
            value === opt
              ? "border-violet-400/35 bg-violet-500/10 text-white"
              : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-white/[0.1] hover:bg-white/[0.04]"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="h-3.5 w-3.5 shrink-0 accent-violet-500"
          />
          <span className="leading-snug">{opt}</span>
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
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex min-h-[2.25rem] items-center justify-center rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition ${
            value === opt
              ? "border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-indigo-700/90 text-white shadow-[0_0_12px_rgba(99,102,241,0.12)]"
              : "border-white/[0.08] bg-white/[0.03] text-white/68 hover:bg-white/[0.05]"
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
  onCreateAnotherMaster,
}: Props) {
  const reduce = useReducedMotion()
  const { refreshAccess } = useBetaMasteringGate()
  const sessionId = sessionAnalytics.sessionId

  const [show, setShow] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [masterRating, setMasterRating] = useState(8)
  const [likedFeatures, setLikedFeatures] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])
  const [optionalComment, setOptionalComment] = useState("")
  const [wouldUseAgain, setWouldUseAgain] = useState("")
  const [role, setRole] = useState("")
  const [genre, setGenre] = useState("")
  const [daw, setDaw] = useState("")
  const [loudness, setLoudness] = useState("")
  const [lowEnd, setLowEnd] = useState("")
  const [stereoImage, setStereoImage] = useState("")
  const [clarity, setClarity] = useState("")
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

  const handleCreateAnother = useCallback(() => {
    onCreateAnotherMaster?.()
    dismiss("submitted")
  }, [dismiss, onCreateAnotherMaster])

  const handleSubmit = useCallback(async () => {
    if (likedFeatures.length === 0) {
      setError("Select at least one thing that sounded good.")
      return
    }
    if (improvements.length === 0) {
      setError("Select at least one area that could improve.")
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
      likedFeatures,
      improvements,
      optionalComment,
      wouldUseAgain: wouldUseAgain as (typeof BETA_FEEDBACK_WOULD_RELEASE_OPTIONS)[number],
      role,
      genre,
      daw,
      loudness: loudness as (typeof BETA_LOUDNESS_OPTIONS)[number],
      lowEnd: lowEnd as (typeof BETA_LOW_END_OPTIONS)[number],
      stereoImage: stereoImage as (typeof BETA_STEREO_OPTIONS)[number],
      clarity: clarity as (typeof BETA_CLARITY_OPTIONS)[number],
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
      const json = (await res.json().catch(() => null)) as {
        error?: string
        strippedColumns?: string[]
      } | null
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Could not send feedback.")
        return
      }
      if (json?.strippedColumns?.length) {
        console.warn(
          "[beta-feedback] Saved to responses JSON; apply Supabase migration for columns:",
          json.strippedColumns,
        )
      }
      writeBetaFeedbackStatus("submitted")
      writePostMasterFeedbackStatus(sessionId, "submitted")
      await refreshAccess?.({ silent: true })
      dispatchBetaProfileRefresh()
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }, [
    clarity,
    contactEmail,
    daw,
    genre,
    improvements,
    likedFeatures,
    loudness,
    lowEnd,
    masterObjectKey,
    masterRating,
    optionalComment,
    refreshAccess,
    role,
    sessionAnalytics,
    sessionId,
    stereoImage,
    wouldUseAgain,
  ])

  if (!show) return null

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mx-auto mt-0 w-full max-w-5xl px-0"
      aria-labelledby="beta-master-feedback-title"
    >
      <div className="product-surface-card beta-feedback-card relative flex max-h-[min(70vh,540px)] flex-col overflow-hidden border-violet-400/18 bg-white/[0.035] shadow-[0_0_32px_rgba(124,58,237,0.08)]">
        {submitted ? (
          <BetaFeedbackSuccessPanel onCreateAnother={handleCreateAnother} />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3.5 sm:px-5 sm:pt-4">
              <header className="text-center sm:text-left">
                <h2 id="beta-master-feedback-title" className="text-base font-semibold text-white">
                  Help improve Mastrify
                </h2>
                <p className="mt-1 text-[12px] leading-snug text-white/50">
                  Quick feedback — your download stays available.
                </p>
              </header>

              <div className="mt-3 space-y-3.5">
                <div>
                  <FieldLabel>Rate your master</FieldLabel>
                  <div className="mt-1.5 flex items-center gap-3">
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
                    <span className="w-8 text-center font-mono text-base font-semibold text-violet-200">
                      {masterRating}
                    </span>
                  </div>
                </div>

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
                  <legend className="text-[12px] font-medium text-white/85">Would you use Mastrify again?</legend>
                  <PillChoice
                    options={BETA_FEEDBACK_WOULD_RELEASE_OPTIONS}
                    value={wouldUseAgain}
                    onChange={setWouldUseAgain}
                  />
                </fieldset>

                <div className="grid grid-cols-1 items-start gap-6 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <SectionTitle>About you</SectionTitle>
                      <RadioRow
                        name="beta-role"
                        options={BETA_FEEDBACK_ROLE_OPTIONS}
                        value={role}
                        onChange={setRole}
                      />
                    </div>
                    <div>
                      <SectionTitle>Genre</SectionTitle>
                      <RadioRow
                        name="beta-genre"
                        options={BETA_RESULT_GENRE_OPTIONS.map((o) => o.label)}
                        value={BETA_RESULT_GENRE_OPTIONS.find((o) => o.value === genre)?.label ?? ""}
                        onChange={(label) => {
                          const match = BETA_RESULT_GENRE_OPTIONS.find((o) => o.label === label)
                          setGenre(match?.value ?? "Other")
                        }}
                      />
                    </div>
                    <div>
                      <SectionTitle>DAW</SectionTitle>
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
                  </div>

                  <div className="space-y-2.5">
                    <SectionTitle>Mastering experience</SectionTitle>
                    <div>
                      <FieldLabel>Loudness</FieldLabel>
                      <PillChoice options={BETA_LOUDNESS_OPTIONS} value={loudness} onChange={setLoudness} />
                    </div>
                    <div>
                      <FieldLabel>Low-end</FieldLabel>
                      <PillChoice options={BETA_LOW_END_OPTIONS} value={lowEnd} onChange={setLowEnd} />
                    </div>
                    <div>
                      <FieldLabel>Stereo image</FieldLabel>
                      <PillChoice options={BETA_STEREO_OPTIONS} value={stereoImage} onChange={setStereoImage} />
                    </div>
                    <div>
                      <FieldLabel>Clarity</FieldLabel>
                      <PillChoice options={BETA_CLARITY_OPTIONS} value={clarity} onChange={setClarity} />
                    </div>
                  </div>
                </div>

                <BetaFeedbackOptionalNotes value={optionalComment} onChange={setOptionalComment} />
              </div>
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-white/[0.08] bg-gradient-to-t from-[#0a0a12] via-[#0a0a12]/98 to-[#0a0a12]/90 px-4 py-3 backdrop-blur-md sm:px-5">
              {error ? (
                <p className="mb-2 text-center text-xs text-rose-300/90" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-5 text-[14px] font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.14)] transition hover:brightness-[1.06] disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Submit feedback"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => dismiss("skipped")}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-[14px] font-semibold text-white/62 transition hover:bg-white/[0.06] disabled:opacity-50 sm:min-w-[6.5rem]"
                >
                  Skip
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.section>
  )
}
