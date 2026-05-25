"use client"

import { useCallback, useState } from "react"
import { createMasterSessionId } from "../../../lib/masterSessionId"
import { isBetaFeedbackEnabled } from "../../../lib/betaFeedbackFeature"
import { readPulseSent, writePulseSent } from "../../../lib/betaFeedbackPulseStorage"
import {
  ANALYSIS_ACCURACY_OPTIONS,
  PREVIEW_COMPARISON_OPTIONS,
  PREVIEW_STOOD_OUT_OPTIONS,
  type BetaFeedbackStage,
} from "../../../lib/betaFeedbackPulseTypes"

type Props = {
  stage: "analysis" | "preview"
  sessionId?: string
  trackName?: string | null
  masteringStyle?: string
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export default function BetaFeedbackPulse({ stage, sessionId: sessionIdProp, trackName, masteringStyle }: Props) {
  const [dismissed, setDismissed] = useState(() => readPulseSent(stage))
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [analysisAccuracy, setAnalysisAccuracy] = useState("")
  const [analysisFeelsWrong, setAnalysisFeelsWrong] = useState("")
  const [previewComparison, setPreviewComparison] = useState("")
  const [previewStoodOut, setPreviewStoodOut] = useState<string[]>([])

  const submit = useCallback(async () => {
    const sessionId = sessionIdProp?.trim() || createMasterSessionId()
    setSubmitting(true)

    const payload =
      stage === "analysis"
        ? {
            feedbackStage: "analysis" as const,
            sessionId,
            trackName,
            analysisAccuracy,
            analysisFeelsWrong: analysisAccuracy === "No" ? analysisFeelsWrong : undefined,
          }
        : {
            feedbackStage: "preview" as const,
            sessionId,
            trackName,
            masteringStyle,
            previewComparison,
            previewStoodOut,
          }

    const res = await fetch("/api/beta-feedback/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSubmitting(false)
    if (res.ok) {
      writePulseSent(stage)
      setDone(true)
      setTimeout(() => setDismissed(true), 1200)
    }
  }, [
    stage,
    sessionIdProp,
    trackName,
    masteringStyle,
    analysisAccuracy,
    analysisFeelsWrong,
    previewComparison,
    previewStoodOut,
  ])

  if (!isBetaFeedbackEnabled() || dismissed) return null

  const stageLabel: Record<Exclude<BetaFeedbackStage, "completed">, string> = {
    analysis: "Quick check — analysis",
    preview: "Quick check — preview",
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-100/90">
        Thanks — feedback saved.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/55">
        {stageLabel[stage]}
      </p>

      {stage === "analysis" ? (
        <div className="mt-3 space-y-3">
          <p className="text-[13px] font-medium text-white/88">Does this analysis feel accurate?</p>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_ACCURACY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnalysisAccuracy(opt)}
                className={`rounded-lg border px-3 py-2 text-[13px] transition ${
                  analysisAccuracy === opt
                    ? "border-violet-400/40 bg-violet-500/15 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:bg-white/[0.05]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {analysisAccuracy === "No" ? (
            <textarea
              value={analysisFeelsWrong}
              onChange={(e) => setAnalysisFeelsWrong(e.target.value)}
              rows={2}
              placeholder="What feels wrong?"
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-[13px] font-medium text-white/88">How does this compare to your original?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PREVIEW_COMPARISON_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPreviewComparison(opt)}
                  className={`rounded-lg border px-3 py-2 text-[13px] transition ${
                    previewComparison === opt
                      ? "border-violet-400/40 bg-violet-500/15 text-white"
                      : "border-white/[0.08] bg-white/[0.02] text-white/70"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-medium text-white/88">What stood out?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PREVIEW_STOOD_OUT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPreviewStoodOut((prev) => toggle(prev, opt))}
                  className={`rounded-lg border px-2.5 py-1.5 text-[12px] transition ${
                    previewStoodOut.includes(opt)
                      ? "border-violet-400/40 bg-violet-500/15 text-white"
                      : "border-white/[0.08] text-white/65"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => {
            writePulseSent(stage)
            setDismissed(true)
          }}
          className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-white/60"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
