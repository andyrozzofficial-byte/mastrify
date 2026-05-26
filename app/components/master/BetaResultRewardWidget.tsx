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

export default function BetaResultRewardWidget({ betaUi, className = "" }: Props) {
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
    <motion.aside
      initial={reduce ? false : { opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={`pointer-events-none absolute right-0 top-0 z-20 hidden w-[min(100%,13.5rem)] sm:block ${className}`}
      aria-label="Beta rewards progress"
    >
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-violet-400/22 bg-black/75 px-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-200/75">+1 Complete Master</p>
        <p className="mt-1.5 text-[10px] text-white/55">Current progress:</p>
        <p className="text-[12px] font-semibold tabular-nums text-white/92">{label}</p>
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]"
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
        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Next reward</p>
        <p className="mt-0.5 text-[11px] font-medium leading-snug text-white/82">
          <span aria-hidden>🎁 </span>
          {betaUi.nextReward}
        </p>
      </div>
    </motion.aside>
  )
}
