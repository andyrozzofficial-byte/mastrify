"use client"

import { motion, useReducedMotion } from "framer-motion"

const STEPS = ["Upload", "Settings", "Master"] as const

import type { MasterWorkflowPhase } from "../../../lib/masterWorkflow"

export type MasterFlowPhase = MasterWorkflowPhase

type Props = {
  phase: MasterFlowPhase
  className?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

function stepIndex(phase: MasterFlowPhase): number {
  if (phase === "upload") return 0
  if (phase === "settings") return 1
  return 2
}

export default function MasterFlowStepRail({ phase, className = "" }: Props) {
  const reduce = useReducedMotion()
  const active = stepIndex(phase)

  return (
    <motion.div
      className={`flex w-full max-w-sm items-center justify-center ${className}`}
      role="group"
      aria-label="Mastering progress"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {STEPS.map((label, i) => (
        <div key={label} className="contents">
          {i > 0 ? (
            <div className="relative mx-1 h-px min-w-[1.75rem] flex-1 max-w-[3.5rem] sm:mx-1.5" aria-hidden>
              <div className="absolute inset-0 bg-white/[0.08]" />
              {active >= i ? (
                <motion.div
                  className="absolute inset-y-0 left-0 h-full rounded-full bg-violet-500/45"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.45, ease: EASE }}
                />
              ) : null}
            </div>
          ) : null}
          <div className="flex w-[4rem] shrink-0 flex-col items-center sm:w-[4.25rem]">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold sm:h-[2.1rem] sm:w-[2.1rem] sm:text-xs ${
                i < active
                  ? "bg-violet-600/20 text-violet-100/80 ring-1 ring-violet-400/20"
                  : i === active
                    ? "bg-violet-600 text-white ring-1 ring-white/10"
                    : "border border-white/[0.08] bg-black/35 text-white/55"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`mt-1.5 text-center text-[8px] font-medium uppercase tracking-[0.18em] sm:text-[9px] ${
                i === active ? "text-white/72" : i < active ? "text-white/58" : "text-white/45"
              }`}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </motion.div>
  )
}
