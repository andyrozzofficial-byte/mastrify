"use client"

import { motion, useReducedMotion } from "framer-motion"

export const PROCESSING_STEPS = [
  "Analyzing mix",
  "Balancing EQ",
  "Optimizing dynamics",
  "Enhancing stereo image",
  "Finalizing master",
] as const

type Props = {
  activeStep: number
}

export default function ProcessingStageList({ activeStep }: Props) {
  const reduceMotion = useReducedMotion()
  const perceptual = Math.min(100, ((activeStep + 0.38) / PROCESSING_STEPS.length) * 100)

  return (
    <div className="fluid-surface">
      <div className="mb-5 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-violet-500/85"
          initial={{ width: "0%" }}
          animate={{ width: `${perceptual}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <ul className="flex min-w-0 flex-col gap-0">
        {PROCESSING_STEPS.map((label, i) => {
          const done = i < activeStep
          const active = i === activeStep
          const pending = i > activeStep

          const rowClass = `relative flex min-h-[3.25rem] min-w-0 items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors sm:min-h-[3.5rem] sm:gap-3.5 sm:px-3 sm:py-3 md:min-h-[3.65rem] md:px-3.5 md:py-3.5 ${
            active ? "bg-white/[0.04] ring-1 ring-white/[0.06]" : "bg-transparent"
          }`

          return (
            <li key={label} className={rowClass}>
              <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center md:h-8 md:w-8">
                {done ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/25 md:h-8 md:w-8">
                    <svg
                      className="h-3.5 w-3.5 text-emerald-300/95"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.4}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : active ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-400/35 bg-violet-500/15 md:h-8 md:w-8">
                    <span className="h-2 w-2 rounded-full bg-violet-200/90" />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] md:h-8 md:w-8">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  </span>
                )}
              </span>

              <div
                className={`relative z-[1] min-w-0 flex-1 text-left transition-opacity duration-300 ${
                  pending ? "opacity-35" : done ? "opacity-85" : "opacity-100"
                }`}
              >
                <span
                  className={`block text-[13px] font-medium tracking-wide md:text-[14px] ${
                    active ? "text-white" : done ? "text-white/75" : "text-white/65"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`mt-0.5 block min-h-[1.125rem] text-[11px] font-normal tracking-wide md:min-h-[1.25rem] md:text-xs ${
                    active ? "text-white/45 opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  aria-hidden={!active}
                >
                  Processing…
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
