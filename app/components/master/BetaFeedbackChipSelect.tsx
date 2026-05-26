"use client"

import { toggleChipSelection } from "../../../lib/betaFeedbackChipOptions"

type Props = {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
  className?: string
}

export default function BetaFeedbackChipSelect({ label, options, selected, onChange, className = "" }: Props) {
  return (
    <fieldset className={className}>
      <legend className="text-[15px] font-medium text-white/88">{label}</legend>
      <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(toggleChipSelection(selected, opt))}
              className={`rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition sm:px-4 sm:py-2.5 ${
                active
                  ? "border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-indigo-700/90 text-white shadow-[0_0_16px_rgba(99,102,241,0.15)]"
                  : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/[0.12] hover:bg-white/[0.05]"
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
