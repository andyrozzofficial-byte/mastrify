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
    <div className="w-full">
      <motion.div
        className="mb-6 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.div
          className="relative h-full rounded-full bg-gradient-to-r from-violet-500/80 via-indigo-400/90 to-cyan-400/70 shadow-[0_0_20px_rgba(129,140,248,0.35)]"
          initial={{ width: "0%" }}
          animate={{ width: `${perceptual}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute right-0 top-1/2 h-4 w-12 -translate-y-1/2 rounded-full bg-white/30 blur-md"
            animate={reduceMotion ? {} : { opacity: [0.4, 0.85, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>

      <ul className="flex flex-col gap-0">
        {PROCESSING_STEPS.map((label, i) => {
          const done = i < activeStep
          const active = i === activeStep
          const pending = i > activeStep

          return (
            <motion.li
              key={label}
              layout
              className={`relative flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors md:gap-4 md:px-4 md:py-4 ${
                active
                  ? "bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : done
                    ? "bg-transparent"
                    : "bg-transparent opacity-90"
              }`}
              animate={
                active && !reduceMotion
                  ? { boxShadow: ["0 0 0 rgba(139,92,246,0)", "0 0 24px rgba(99,102,241,0.08)", "0 0 0 rgba(139,92,246,0)"] }
                  : {}
              }
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              {active && (
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/[0.07] via-transparent to-cyan-500/[0.04]"
                  layoutId="stageGlow"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}

              <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center md:h-8 md:w-8">
                {done ? (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/[0.1] shadow-[0_0_16px_rgba(52,211,153,0.15)] ring-1 ring-emerald-400/30 md:h-8 md:w-8"
                  >
                    <svg className="h-3.5 w-3.5 text-emerald-300/95" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.span>
                ) : active ? (
                  <motion.span
                    className="relative flex h-7 w-7 items-center justify-center md:h-8 md:w-8"
                    animate={reduceMotion ? {} : { scale: [1, 1.06, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="absolute inset-0 rounded-full bg-violet-400/25 blur-md" />
                    <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-violet-300/50 bg-violet-500/20 shadow-[0_0_18px_rgba(139,92,246,0.25)] md:h-7 md:w-7">
                      <motion.span
                        className="h-2 w-2 rounded-full bg-gradient-to-br from-white to-violet-200"
                        animate={reduceMotion ? {} : { opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </span>
                  </motion.span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] md:h-8 md:w-8">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  </span>
                )}
              </span>

              <motion.div
                className="relative z-[1] min-w-0 flex-1 text-left"
                animate={{ opacity: pending ? 0.35 : done ? 0.88 : 1 }}
                transition={{ duration: 0.45 }}
              >
                <span
                  className={`block text-[13px] font-medium tracking-wide md:text-[14px] ${
                    active ? "text-white" : done ? "text-white/75" : "text-white/38"
                  }`}
                >
                  {label}
                </span>
                {active && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-0.5 block text-[11px] font-normal tracking-wide text-violet-200/45 md:text-xs"
                  >
                    Processing with musical intelligence…
                  </motion.span>
                )}
              </motion.div>
            </motion.li>
          )
        })}
      </ul>
    </motion.div>
  )
}
