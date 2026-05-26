"use client"

import { useState } from "react"
import BetaReportIssueModal from "./BetaReportIssueModal"

type Props = {
  className?: string
  variant?: "card" | "inline"
}

export default function BetaReportIssueSection({ className = "", variant = "card" }: Props) {
  const [open, setOpen] = useState(false)

  if (variant === "inline") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`text-left text-[13px] font-medium text-violet-200/85 transition hover:text-violet-100 ${className}`}
        >
          <span aria-hidden>🐞 </span>
          Report Issue
        </button>
        <BetaReportIssueModal open={open} onClose={() => setOpen(false)} />
      </>
    )
  }

  return (
    <>
      <section
        className={`mx-auto mt-8 w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6 sm:py-5 ${className}`}
        aria-label="Report issue"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-semibold text-white/92">
              <span aria-hidden>🐞 </span>
              Report Issue
            </p>
            <p className="mt-1 text-[13px] leading-snug text-white/52">
              Found a problem? Tell us what happened and earn +2 Insider points.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 px-5 text-[14px] font-semibold text-violet-100/95 transition hover:border-violet-400/40 hover:bg-violet-500/15"
          >
            Report issue
          </button>
        </div>
      </section>
      <BetaReportIssueModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
