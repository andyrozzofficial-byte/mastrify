"use client"

import { useState } from "react"

const textareaClass =
  "mt-2 w-full resize-y rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2.5 text-[14px] leading-relaxed text-white outline-none placeholder:text-white/32 focus:border-violet-400/35 focus:ring-2 focus:ring-violet-500/15"

type Props = {
  value: string
  onChange: (value: string) => void
}

export default function BetaFeedbackOptionalNotes({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-white/[0.06] pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-violet-200/85 transition hover:border-violet-400/25 hover:bg-violet-500/[0.08] hover:text-violet-100"
        aria-expanded={open}
      >
        <span className="font-mono text-[14px] leading-none text-violet-300/90" aria-hidden>
          {open ? "−" : "+"}
        </span>
        {open ? "Hide extra notes" : "Leave extra notes"}
      </button>

      {open ? (
        <label className="mt-2 block">
          <span className="text-[12px] font-medium text-white/75">Additional comments (optional)</span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            placeholder="Anything else you'd like us to improve?"
            className={textareaClass}
          />
        </label>
      ) : null}
    </div>
  )
}
