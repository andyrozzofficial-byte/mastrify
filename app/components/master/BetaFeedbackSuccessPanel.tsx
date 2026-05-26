"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { BetaMasteringUiState } from "../../../lib/betaPoints"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  betaUi: BetaMasteringUiState
  onCreateAnother: () => void
}

export default function BetaFeedbackSuccessPanel({ betaUi, onCreateAnother }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex flex-col items-center px-4 py-8 text-center sm:py-10"
    >
      <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
        <span className="text-emerald-300/95" aria-hidden>
          ✓{" "}
        </span>
        Thanks for helping improve Mastrify
      </p>

      <p className="mt-4 text-[13px] font-semibold text-violet-200/90">+1 Insider point earned</p>

      <div className="mt-6 w-full max-w-xs rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5 text-left">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">Current progress</p>
        <p className="mt-1.5 text-[15px] font-semibold tabular-nums text-white/92">{betaUi.progressLabel}</p>
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuenow={betaUi.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400"
            style={{ width: `${Math.min(100, Math.max(0, betaUi.progressPct))}%` }}
          />
        </div>
        <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">Next reward</p>
        <p className="mt-1 text-[13px] font-medium leading-snug text-white/82">
          <span aria-hidden>🎁 </span>
          {betaUi.nextReward}
        </p>
      </div>

      <Link
        href="/master"
        onClick={onCreateAnother}
        className="mt-8 inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-6 text-[15px] font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.14)] transition hover:brightness-[1.06] active:scale-[0.99]"
      >
        Create another master
      </Link>
    </motion.div>
  )
}
