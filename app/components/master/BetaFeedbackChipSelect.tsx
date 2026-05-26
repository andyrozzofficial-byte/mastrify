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
      <legend className="text-[13px] font-medium text-white/85">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-3">
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(toggleChipSelection(selected, opt))}
              className={`flex min-h-[2.25rem] items-center justify-center rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold leading-tight transition-all duration-200 sm:min-h-[2.35rem] sm:text-[12px] hover:scale-[1.02] ${
                active
                  ? "border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-indigo-700/90 text-white shadow-[0_0_16px_rgba(99,102,241,0.2)]"
                  : "border-white/[0.08] bg-white/[0.03] text-white/68 hover:border-white/[0.12] hover:bg-white/[0.05]"
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
