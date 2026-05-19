"use client"

import { motion, useReducedMotion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

type Item = { title: string; sub: string }

type Props = {
  items: readonly Item[]
  className?: string
}

export default function CinematicTrustRow({ items, className = "" }: Props) {
  const reduce = useReducedMotion()

  return (
    <div className={`cinematic-trust-row hidden gap-2 sm:grid sm:grid-cols-3 sm:gap-2.5 ${className}`.trim()}>
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          className="cinematic-trust-chip rounded-lg border border-white/[0.05] bg-black/[0.28] px-3 py-3 text-center"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: EASE }}
        >
          <p className="text-[11px] font-medium text-white/72">{item.title}</p>
          <p className="mt-0.5 text-[10px] text-white/60">{item.sub}</p>
        </motion.div>
      ))}
    </div>
  )
}
