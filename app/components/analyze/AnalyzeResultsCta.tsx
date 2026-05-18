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
        className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-violet-600/[0.12] via-indigo-500/[0.06] to-cyan-500/[0.08] opacity-70 blur-md"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative overflow-hidden rounded-xl border border-violet-400/[0.14] bg-gradient-to-br from-violet-950/35 via-black/55 to-slate-950/40 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_32px_rgba(99,102,241,0.08),0_20px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl md:flex md:items-center md:justify-between md:gap-6 md:px-5 md:py-4">
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
            whileHover={reduce ? undefined : { scale: 1.02, y: -1 }}
            whileTap={reduce ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.22, ease: ANALYZE_EASE }}
            className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-gradient-to-r from-[#6d28d9] via-[#4f46e5] to-[#2563eb] px-7 text-[13px] font-semibold text-white shadow-[0_0_22px_rgba(99,102,241,0.22),0_12px_32px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.12] transition-[box-shadow,filter] duration-300 hover:shadow-[0_0_28px_rgba(99,102,241,0.28),0_14px_36px_rgba(0,0,0,0.42)] hover:brightness-[1.04]"
          >
            Master my track
          </motion.button>
          <motion.button
            type="button"
            onClick={onFlow}
            disabled={!canMaster}
            whileHover={canMaster && !reduce ? { scale: 1.01, y: -1 } : undefined}
            whileTap={canMaster && !reduce ? { scale: 0.99 } : undefined}
            transition={{ duration: 0.22, ease: ANALYZE_EASE }}
            className={`inline-flex min-h-[46px] items-center justify-center rounded-lg border px-5 text-[13px] font-semibold transition-[border-color,background-color,box-shadow] duration-300 ${
              canMaster
                ? "border-white/[0.12] bg-white/[0.04] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-cyan-400/25 hover:bg-white/[0.06] hover:shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                : "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-white/64"
            }`}
          >
            One-page master
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}
