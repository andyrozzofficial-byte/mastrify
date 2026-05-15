"use client"

import { motion, useReducedMotion } from "framer-motion"

const STEPS = ["Upload", "Settings", "Master"] as const

export type MasterFlowPhase = "upload" | "settings" | "master"

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
      className={`flex w-full max-w-md items-center justify-center ${className}`}
      role="group"
      aria-label="Mastering progress"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {STEPS.map((label, i) => (
        <motion.div key={label} className="contents">
          {i > 0 ? (
            <div className="relative mx-1 h-px min-w-[2rem] flex-1 max-w-[4.5rem] sm:mx-1.5" aria-hidden>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={
                  reduce
                    ? undefined
                    : {
                        opacity: active >= i ? [0.35, 0.65, 0.35] : 0.22,
                      }
                }
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />
              {active >= i ? (
                <motion.div
                  className="absolute inset-y-0 left-0 h-full rounded-full bg-gradient-to-r from-violet-500/40 to-cyan-400/30"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              ) : null}
            </div>
          ) : null}
          <div className="flex w-[4.5rem] shrink-0 flex-col items-center sm:w-[5rem]">
            <motion.span
              className={`relative flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold sm:h-[2.35rem] sm:w-[2.35rem] sm:text-xs ${
                i < active
                  ? "bg-violet-600/25 text-violet-200/80 ring-1 ring-violet-400/25"
                  : i === active
                    ? "bg-gradient-to-b from-violet-500/95 to-indigo-700/95 text-white ring-1 ring-white/10"
                    : "border border-white/[0.08] bg-black/40 text-white/28"
              }`}
              animate={
                reduce || i !== active
                  ? undefined
                  : {
                      boxShadow: [
                        "0 0 0 rgba(139,92,246,0)",
                        "0 0 18px rgba(139,92,246,0.35)",
                        "0 0 0 rgba(139,92,246,0)",
                      ],
                    }
              }
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              {i + 1}
            </motion.span>
            <span
              className={`mt-2 text-center text-[8px] font-medium uppercase tracking-[0.22em] sm:text-[9px] ${
                i === active ? "text-violet-200/75" : i < active ? "text-white/40" : "text-white/26"
              }`}
            >
              {label}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
