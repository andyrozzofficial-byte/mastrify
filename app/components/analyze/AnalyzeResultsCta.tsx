"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ANALYZE_EASE } from "./analyzeMotion"

type Props = {
  canMaster: boolean
  onMaster: () => void
  onFlow: () => void
}

export default function AnalyzeResultsCta({ canMaster, onMaster, onFlow }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.7, ease: ANALYZE_EASE }}
      className="relative"
    >
      <motion.div
        className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-r from-violet-600/[0.10] via-indigo-500/[0.06] to-transparent blur-lg"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="glass-surface relative overflow-hidden rounded-xl border border-violet-400/[0.16] bg-gradient-to-br from-violet-950/42 via-black/60 to-slate-950/48 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_10px_rgba(99,102,241,0.03),0_20px_48px_rgba(0,0,0,0.45)] md:flex md:items-center md:justify-between md:gap-6 md:px-5 md:py-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.04)_0%,transparent_42%,transparent_100%)]"
          aria-hidden
        />
        <div className="relative min-w-0 text-center md:text-left">
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-violet-200/55">Next step</p>
          <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-white/95 md:text-base">
            Ready for a pro master?
          </h3>
          <p className="mt-1.5 max-w-md text-[11px] leading-relaxed text-white/72 md:line-clamp-2">
            Studio-grade loudness and tone — same mastering engine as the full release workflow.
          </p>
        </div>
        <motion.div className="relative mt-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end md:mt-0">
          <motion.button
            type="button"
            onClick={onMaster}
            className="stable-interaction safari-nav-link inline-flex min-h-[46px] items-center justify-center rounded-lg bg-gradient-to-r from-[#6d28d9] via-[#4f46e5] to-[#2563eb] px-7 text-[13px] font-semibold leading-none text-white shadow-[0_0_8px_rgba(99,102,241,0.05),0_12px_32px_rgba(0,0,0,0.30)] ring-1 ring-white/[0.14] transition-[filter] duration-300 hover:brightness-[1.02]"
          >
            Master my track
          </motion.button>
          <motion.button
            type="button"
            onClick={onFlow}
            disabled={!canMaster}
            className={`stable-interaction inline-flex min-h-[46px] items-center justify-center rounded-lg border px-5 text-[13px] font-semibold leading-none transition-[background-color,color] duration-300 ${
              canMaster
                ? "border-white/[0.12] bg-white/[0.04] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-white/[0.16] hover:bg-white/[0.06]"
                : "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-white/64"
            }`}
          >
            One-page master
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
