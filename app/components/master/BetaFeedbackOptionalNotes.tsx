"use client"

import { useState } from "react"

const textareaClass =
  "mt-3 w-full resize-y rounded-xl border border-white/[0.08] bg-black/35 px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/32 focus:border-violet-400/35 focus:ring-2 focus:ring-violet-500/15"

type Props = {
  value: string
  onChange: (value: string) => void
}

export default function BetaFeedbackOptionalNotes({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-white/[0.08] pt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-violet-200/85 transition hover:border-violet-400/25 hover:bg-violet-500/[0.08] hover:text-violet-100"
        aria-expanded={open}
      >
        <span className="font-mono text-[15px] leading-none text-violet-300/90" aria-hidden>
          {open ? "−" : "+"}
        </span>
        {open ? "Hide extra notes" : "Leave extra notes"}
      </button>

      {open ? (
        <label className="mt-4 block">
          <span className="text-[15px] font-medium text-white/80">Additional comments (optional)</span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder="Anything else you'd like us to improve?"
            className={textareaClass}
          />
        </label>
      ) : null}
    </div>
  )
}
