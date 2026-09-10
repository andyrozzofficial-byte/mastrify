"use client"

import { useState } from "react"
import type { AdminFeedbackRow } from "../../../lib/adminTypes"
import { buildRawFeedbackSubmission } from "../../../lib/betaFeedbackSurveyValidation"

export function FeedbackRawSubmissionPanel({ row }: { row: AdminFeedbackRow }) {
  const [open, setOpen] = useState(false)
  const raw = buildRawFeedbackSubmission(row)
  const json = JSON.stringify(raw, null, 2)

  return (
    <section className="rounded-2xl border border-white/[0.09] bg-[#1c1c22]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/55">
            Raw submission JSON
          </h3>
          <p className="mt-1 text-[12px] text-white/42">
            Database row + <code className="text-violet-300/80">responses</code> blob as stored in Supabase
          </p>
        </div>
        <span className="shrink-0 text-sm text-white/40">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="border-t border-white/[0.08] px-5 pb-5">
          <pre className="max-h-[min(28rem,50vh)] overflow-auto rounded-xl border border-white/[0.08] bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90">
            {json}
          </pre>
        </div>
      ) : null}
    </section>
  )
}
