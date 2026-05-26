"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { buildBetaMilestoneProgress } from "../../../lib/betaPoints"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  points: number
  onComplete?: () => void
}

function fractionShort(points: number): string {
  const m = buildBetaMilestoneProgress(points)
  if (!m.nextMilestonePoints) return `${points}`
  return `${points}/${m.nextMilestonePoints}`
}

export default function BetaResultCompleteCelebration({ points, onComplete }: Props) {
  const reduce = useReducedMotion()
  const prevPoints = Math.max(0, points - 1)
  const fromLabel = fractionShort(prevPoints)
  const toLabel = fractionShort(points)
  const startPct = useMemo(() => buildBetaMilestoneProgress(prevPoints).progressPct, [prevPoints])
  const endPct = useMemo(() => buildBetaMilestoneProgress(points).progressPct, [points])

  const [visible, setVisible] = useState(true)
  const [barPct, setBarPct] = useState(reduce ? endPct : startPct)

  useEffect(() => {
    if (reduce) {
      const t = window.setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 1200)
      return () => window.clearTimeout(t)
    }

    const barTimer = window.setTimeout(() => setBarPct(endPct), 120)
    const hideTimer = window.setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 2400)

    return () => {
      window.clearTimeout(barTimer)
      window.clearTimeout(hideTimer)
    }
  }, [reduce, endPct, onComplete])

  if (!visible) return null

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mx-auto mb-6 w-full max-w-md"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 text-center shadow-[0_0_24px_rgba(16,185,129,0.08)]">
        <p className="text-[15px] font-semibold text-emerald-100/95">
          <span aria-hidden>🎉 </span>+1 Complete Master
        </p>
        <p className="mt-1.5 text-[12px] text-white/65">
          Progress updated:{" "}
          <span className="font-semibold tabular-nums text-white/85">
            {fromLabel} → {toLabel}
          </span>
        </p>
        <div className="mx-auto mt-2.5 h-1 max-w-[12rem] overflow-hidden rounded-full bg-white/[0.1]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400/90 to-violet-400/85"
            initial={false}
            animate={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
            transition={{ duration: reduce ? 0 : 1, ease: EASE }}
          />
        </div>
      </div>
    </motion.div>
  )
}
