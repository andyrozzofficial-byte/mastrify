"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { buildBetaMilestoneProgress } from "../../../lib/betaPoints"
import type { BetaMasteringUiState } from "../../../lib/betaPoints"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  betaUi: BetaMasteringUiState
  className?: string
}

function progressFractionLabel(points: number): string {
  const m = buildBetaMilestoneProgress(points)
  if (!m.nextMilestonePoints) return `${points} points`
  return `${points}/${m.nextMilestonePoints} points`
}

/** Inline reward bump — sits below Insider Progress on the result page (not floating). */
export default function BetaResultRewardStrip({ betaUi, className = "" }: Props) {
  const reduce = useReducedMotion()
  const targetPoints = betaUi.points
  const prevPoints = Math.max(0, targetPoints - 1)

  const targetPct = betaUi.progressPct
  const startPct = useMemo(
    () => buildBetaMilestoneProgress(prevPoints).progressPct,
    [prevPoints],
  )

  const [barPct, setBarPct] = useState(reduce ? targetPct : startPct)
  const [label, setLabel] = useState(reduce ? progressFractionLabel(targetPoints) : progressFractionLabel(prevPoints))

  useEffect(() => {
    if (reduce) {
      setBarPct(targetPct)
      setLabel(progressFractionLabel(targetPoints))
      return
    }

    setBarPct(startPct)
    setLabel(progressFractionLabel(prevPoints))

    const barTimer = window.setTimeout(() => setBarPct(targetPct), 80)
    const labelTimer = window.setTimeout(() => setLabel(progressFractionLabel(targetPoints)), 200)

    return () => {
      window.clearTimeout(barTimer)
      window.clearTimeout(labelTimer)
    }
  }, [reduce, startPct, targetPct, targetPoints])

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`rounded-xl border border-violet-400/20 bg-violet-500/[0.08] px-3 py-2.5 sm:px-3.5 sm:py-3 ${className}`}
      aria-label="Master completion reward"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/85">
          +1 Complete Master
        </p>
        <p className="text-[11px] font-semibold tabular-nums text-white/90">{label}</p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.1]"
        role="progressbar"
        aria-valuenow={barPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400"
          initial={false}
          animate={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
          transition={{ duration: reduce ? 0 : 1, ease: EASE }}
        />
      </div>
    </motion.div>
  )
}
