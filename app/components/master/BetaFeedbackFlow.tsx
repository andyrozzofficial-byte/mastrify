"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { readBetaFeedbackStatus, writeBetaFeedbackStatus } from "../../../lib/betaFeedbackStorage"
import { createMasterSessionId } from "../../../lib/masterSessionId"
import type { BetaFeedbackPayload, BetaFeedbackSessionAnalytics } from "../../../lib/betaFeedbackTypes"
import {
  BETA_FEEDBACK_COMPARISON_OPTIONS,
  BETA_FEEDBACK_GENRE_OPTIONS,
  BETA_FEEDBACK_RELEASE_READY_OPTIONS,
  BETA_FEEDBACK_ROLE_OPTIONS,
  BETA_FEEDBACK_SOUNDED_OFF_OPTIONS,
  BETA_FEEDBACK_SPEED_OPTIONS,
  BETA_FEEDBACK_STOOD_OUT_OPTIONS,
  BETA_FEEDBACK_WOULD_RELEASE_OPTIONS,
} from "../../../lib/betaFeedbackTypes"

type Props = {
  engaged: boolean
  masterObjectKey?: string | null
  sessionAnalytics: BetaFeedbackSessionAnalytics
}

type Phase = "hidden" | "invite" | "survey" | "success"

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-[13px] font-medium leading-snug text-white/88">
      {children}
      {required ? <span className="text-rose-300/80"> *</span> : null}
    </p>
  )
}

function RadioOptions({
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
    <div className="mt-2 flex flex-col gap-1.5">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[13px] text-white/78 transition hover:border-white/[0.1] hover:bg-white/[0.04]"
        >
          <input
            type="radio"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="h-3.5 w-3.5 accent-violet-500"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function CheckboxOptions({
  options,
  values,
  onToggle,
}: {
  options: readonly string[]
  values: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[13px] text-white/78 transition hover:border-white/[0.1] hover:bg-white/[0.04]"
        >
          <input
            type="checkbox"
            checked={values.includes(opt)}
            onChange={() => onToggle(opt)}
            className="h-3.5 w-3.5 rounded accent-violet-500"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  )
}

const emptyForm = (): BetaFeedbackPayload => ({
  role: "",
  genre: "",
  comparison: "",
  stoodOut: [],
  soundedOff: [],
  easeRating: 3,
  speedPerception: "",
  releaseReady: "",
  wouldRelease: "",
  useAgainScore: 7,
  recommendScore: 7,
  missing: "",
  oneChange: "",
  worthPaying: "",
  additional: "",
  contactEmail: "",
  contactDiscord: "",
  futureBetaContact: null,
  masterObjectKey: null,
  trackTitle: null,
  sessionId: "",
  trackName: null,
  trackDuration: null,
  masteringStyle: "",
  stereoWidth: 50,
  lowEnd: 50,
  masterLufs: null,
  processingTimeMs: null,
})

export default function BetaFeedbackFlow({ engaged, masterObjectKey, sessionAnalytics }: Props) {
  const [phase, setPhase] = useState<Phase>("hidden")
  const [form, setForm] = useState<BetaFeedbackPayload>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitFailed, setSubmitFailed] = useState(false)
  const [submitDevError, setSubmitDevError] = useState<string | null>(null)

  useEffect(() => {
    if (readBetaFeedbackStatus()) {
      setPhase("hidden")
      return
    }
    if (!engaged) {
      setPhase("hidden")
      return
    }
    const t = window.setTimeout(() => {
      if (!readBetaFeedbackStatus()) setPhase("invite")
    }, 2400)
    return () => window.clearTimeout(t)
  }, [engaged])

  const handleSkip = useCallback(() => {
    writeBetaFeedbackStatus("skipped")
    setPhase("hidden")
  }, [])

  const patch = useCallback((partial: Partial<BetaFeedbackPayload>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }, [])

  const validate = useCallback(() => {
    if (!form.role || !form.genre || !form.comparison) return "Please answer the first three questions."
    if (form.stoodOut.length === 0) return "Select at least one item for what stood out."
    if (form.soundedOff.length === 0) return "Select at least one option for what sounded off."
    if (!form.speedPerception) return "Please rate processing speed."
    if (!form.releaseReady || !form.wouldRelease) return "Please answer the release-ready questions."
    return null
  }, [form])

  const persistFeedback = useCallback(async () => {
    const sessionId = sessionAnalytics.sessionId.trim() || createMasterSessionId()
    const trackName = sessionAnalytics.trackName ?? null
    const payload: BetaFeedbackPayload = {
      ...form,
      masterObjectKey: masterObjectKey ?? null,
      trackTitle: trackName,
      sessionId,
      trackName,
      trackDuration: sessionAnalytics.trackDuration,
      masteringStyle: sessionAnalytics.masteringStyle,
      stereoWidth: Math.round(sessionAnalytics.stereoWidth),
      lowEnd: Math.round(sessionAnalytics.lowEnd),
      masterLufs: sessionAnalytics.masterLufs,
      processingTimeMs: sessionAnalytics.processingTimeMs,
    }

    const res = await fetch("/api/beta-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      details?: string | null
      code?: string | null
      hint?: string | null
    } | null

    console.log("Feedback response:", data)

    if (res.ok) return

    const apiMessage =
      typeof data?.error === "string"
        ? data.details
          ? `${data.error} (${data.details})`
          : data.error
        : null

    const err = new Error("submit_failed") as Error & { devMessage?: string | null }
    err.devMessage = apiMessage
    throw err
  }, [form, masterObjectKey, sessionAnalytics])

  const handleSubmit = useCallback(async () => {
    const err = validate()
    if (err) {
      setSubmitError(err)
      return
    }
    setSubmitting(true)
    setSubmitError("")
    setSubmitFailed(false)
    setSubmitDevError(null)
    try {
      await persistFeedback()
      writeBetaFeedbackStatus("submitted")
      setPhase("success")
      window.setTimeout(() => setPhase("hidden"), 4200)
    } catch (e) {
      setSubmitFailed(true)
      const devMessage =
        e && typeof e === "object" && "devMessage" in e
          ? (e as { devMessage?: string | null }).devMessage
          : null
      setSubmitDevError(devMessage ?? null)
    } finally {
      setSubmitting(false)
    }
  }, [validate, persistFeedback])

  const handleRetrySubmit = useCallback(() => {
    setSubmitFailed(false)
    setSubmitDevError(null)
    void handleSubmit()
  }, [handleSubmit])

  if (phase === "hidden") return null

  return (
    <>
      <AnimatePresence>
        {phase === "invite" ? (
          <motion.div
            key="invite"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
          >
            <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#090912]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">Beta feedback</p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-white">Help shape Mastrify</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/62">
                Your feedback helps us improve the mastering engine and overall experience. Takes around 2 minutes.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm())
                    setSubmitError("")
                    setSubmitFailed(false)
                    setPhase("survey")
                  }}
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-5 text-sm font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.12)] ring-1 ring-white/[0.08] transition hover:brightness-[1.06] active:scale-[0.99]"
                >
                  Give Feedback
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-white/76 transition hover:bg-white/[0.055] hover:text-white/90 active:scale-[0.99]"
                >
                  Skip
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "survey" || phase === "success" ? (
          <div
            key="survey-shell"
            className="fixed inset-0 z-[60] flex items-end justify-center overflow-hidden bg-black/72 px-0 pb-0 backdrop-blur-md sm:items-center sm:px-4 sm:py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beta-feedback-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="flex h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-white/[0.1] bg-[#090912] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:h-auto sm:max-h-[min(88dvh,720px)] sm:rounded-2xl"
            >
              {phase === "success" ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
                  <p className="max-w-sm text-xl font-semibold leading-snug text-white sm:text-2xl">
                    Feedback completed ✓ Thanks for helping improve Mastrify
                  </p>
                </div>
              ) : submitFailed ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
                  <h2 className="text-xl font-semibold text-white">Couldn&apos;t send feedback</h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/62">
                    {submitDevError || "Please try again"}
                  </p>
                  <div className="mt-8 flex w-full max-w-xs flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleRetrySubmit}
                      disabled={submitting}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-4 text-sm font-semibold text-white transition hover:brightness-[1.06] disabled:opacity-60"
                    >
                      {submitting ? "Sending…" : "Retry"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitFailed(false)
                        setPhase("invite")
                      }}
                      disabled={submitting}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-white/76 transition hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="shrink-0 border-b border-white/[0.06] px-4 py-4 sm:px-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">
                      Beta Feedback — Mastering Platform
                    </p>
                    <h2 id="beta-feedback-title" className="mt-2 text-lg font-semibold text-white">
                      Thanks for testing our mastering beta
                    </h2>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/58">
                      We&apos;re building this platform together with real artists and producers, so every piece of
                      feedback genuinely helps.
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    <div className="space-y-6">
                      <section>
                        <FieldLabel required>1. Which best describes you?</FieldLabel>
                        <RadioOptions
                          name="role"
                          options={BETA_FEEDBACK_ROLE_OPTIONS}
                          value={form.role}
                          onChange={(role) => patch({ role })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>2. What genre did you test with?</FieldLabel>
                        <RadioOptions
                          name="genre"
                          options={BETA_FEEDBACK_GENRE_OPTIONS}
                          value={form.genre}
                          onChange={(genre) => patch({ genre })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>3. How did the mastered version compare to your original mix?</FieldLabel>
                        <RadioOptions
                          name="comparison"
                          options={BETA_FEEDBACK_COMPARISON_OPTIONS}
                          value={form.comparison}
                          onChange={(comparison) => patch({ comparison })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>4. What stood out most about the master? (Select all that apply)</FieldLabel>
                        <CheckboxOptions
                          options={BETA_FEEDBACK_STOOD_OUT_OPTIONS}
                          values={form.stoodOut}
                          onToggle={(v) => patch({ stoodOut: toggleInList(form.stoodOut, v) })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>5. Did anything sound off?</FieldLabel>
                        <CheckboxOptions
                          options={BETA_FEEDBACK_SOUNDED_OFF_OPTIONS}
                          values={form.soundedOff}
                          onToggle={(v) => patch({ soundedOff: toggleInList(form.soundedOff, v) })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>6. How easy was the experience?</FieldLabel>
                        <p className="mt-1 text-[11px] text-white/48">1 = Confusing · 5 = Extremely smooth</p>
                        <div className="mt-3 flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={form.easeRating}
                            onChange={(e) => patch({ easeRating: Number(e.target.value) })}
                            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-500"
                          />
                          <span className="w-6 text-center font-mono text-sm text-cyan-300/80">{form.easeRating}</span>
                        </div>
                      </section>

                      <section>
                        <FieldLabel required>7. How did you feel about the processing speed?</FieldLabel>
                        <RadioOptions
                          name="speed"
                          options={BETA_FEEDBACK_SPEED_OPTIONS}
                          value={form.speedPerception}
                          onChange={(speedPerception) => patch({ speedPerception })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>8. Did the result feel release-ready?</FieldLabel>
                        <RadioOptions
                          name="releaseReady"
                          options={BETA_FEEDBACK_RELEASE_READY_OPTIONS}
                          value={form.releaseReady}
                          onChange={(releaseReady) => patch({ releaseReady })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>9. Would you release a song mastered with this version of Mastrify?</FieldLabel>
                        <RadioOptions
                          name="wouldRelease"
                          options={BETA_FEEDBACK_WOULD_RELEASE_OPTIONS}
                          value={form.wouldRelease}
                          onChange={(wouldRelease) => patch({ wouldRelease })}
                        />
                      </section>

                      <section>
                        <FieldLabel required>10. How likely are you to use this service again?</FieldLabel>
                        <p className="mt-1 text-[11px] text-white/48">0–10</p>
                        <div className="mt-3 flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={form.useAgainScore}
                            onChange={(e) => patch({ useAgainScore: Number(e.target.value) })}
                            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-500"
                          />
                          <span className="w-6 text-center font-mono text-sm text-cyan-300/80">{form.useAgainScore}</span>
                        </div>
                      </section>

                      <section>
                        <FieldLabel required>11. How likely are you to recommend Mastrify to a friend or collaborator?</FieldLabel>
                        <p className="mt-1 text-[11px] text-white/48">0–10</p>
                        <div className="mt-3 flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={1}
                            value={form.recommendScore}
                            onChange={(e) => patch({ recommendScore: Number(e.target.value) })}
                            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-violet-500"
                          />
                          <span className="w-6 text-center font-mono text-sm text-cyan-300/80">{form.recommendScore}</span>
                        </div>
                      </section>

                      <section>
                        <FieldLabel>12. What did you feel was missing?</FieldLabel>
                        <textarea
                          value={form.missing}
                          onChange={(e) => patch({ missing: e.target.value })}
                          rows={2}
                          className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/32 focus:border-violet-300/30"
                          placeholder="Optional"
                        />
                      </section>

                      <section>
                        <FieldLabel>13. If you could change ONE thing immediately, what would it be?</FieldLabel>
                        <textarea
                          value={form.oneChange}
                          onChange={(e) => patch({ oneChange: e.target.value })}
                          rows={2}
                          className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/32 focus:border-violet-300/30"
                          placeholder="Optional"
                        />
                      </section>

                      <section>
                        <FieldLabel>14. What would make this service worth paying for?</FieldLabel>
                        <textarea
                          value={form.worthPaying}
                          onChange={(e) => patch({ worthPaying: e.target.value })}
                          rows={2}
                          className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/32 focus:border-violet-300/30"
                          placeholder="Optional"
                        />
                      </section>

                      <section>
                        <FieldLabel>15. Any additional thoughts or feedback?</FieldLabel>
                        <textarea
                          value={form.additional}
                          onChange={(e) => patch({ additional: e.target.value })}
                          rows={3}
                          className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/32 focus:border-violet-300/30"
                          placeholder="Optional"
                        />
                      </section>

                      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-[12px] font-medium text-white/72">Optional contact</p>
                        <label className="mt-3 block text-[11px] text-white/50">Email</label>
                        <input
                          type="email"
                          value={form.contactEmail}
                          onChange={(e) => patch({ contactEmail: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/30"
                          placeholder="you@example.com"
                        />
                        <label className="mt-3 block text-[11px] text-white/50">Discord</label>
                        <input
                          type="text"
                          value={form.contactDiscord}
                          onChange={(e) => patch({ contactDiscord: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/30"
                          placeholder="username"
                        />
                        <p className="mt-4 text-[12px] text-white/62">
                          Would you like to be contacted for future beta tests?
                        </p>
                        <div className="mt-2 flex gap-2">
                          {(["Yes", "No"] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                patch({ futureBetaContact: opt === "Yes" ? true : false })
                              }
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                (opt === "Yes" && form.futureBetaContact === true) ||
                                (opt === "No" && form.futureBetaContact === false)
                                  ? "border-violet-400/40 bg-violet-500/15 text-white"
                                  : "border-white/[0.08] bg-white/[0.02] text-white/65 hover:bg-white/[0.04]"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>

                    {submitError ? <p className="mt-4 text-xs text-rose-300/90">{submitError}</p> : null}
                  </div>

                  <div className="shrink-0 flex gap-2 border-t border-white/[0.06] p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitFailed(false)
                        setPhase("invite")
                      }}
                      disabled={submitting}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-white/76 transition hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="inline-flex min-h-[46px] flex-[1.4] items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-4 text-sm font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.12)] transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Sending…" : "Submit feedback"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
