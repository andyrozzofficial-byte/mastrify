"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ANALYZE_EASE } from "./analyzeMotion"

type Props = {
  label: string
  vibe: string
  feel: string
  technical: string
  index?: number
}

/** Feel-first metric cell — emotional descriptor dominates, technical value de-emphasized */
export default function MetricInsightTile({ label, vibe, feel, technical, index = 0 }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.04, 0.28), ease: ANALYZE_EASE }}
      whileHover={
        reduce
          ? undefined
          : {
              y: -2,
              transition: { duration: 0.25, ease: ANALYZE_EASE },
            }
      }
      className="card-pad-mobile group relative flex min-h-[7.1rem] flex-col rounded-xl border border-white/[0.07] bg-black/[0.38] pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-white/[0.1] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_40px_rgba(0,0,0,0.42),0_0_24px_rgba(99,102,241,0.06)] sm:min-h-[7.5rem] md:min-h-[7.75rem] md:rounded-2xl md:px-4 md:py-4 md:pb-4"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/50">{label}</p>
      <div className="mt-3 flex flex-1 flex-col">
        <p className="bg-gradient-to-br from-white via-white to-violet-100/85 bg-clip-text text-[1.35rem] font-semibold leading-[1.1] tracking-tight text-transparent sm:text-[1.4rem] md:text-[1.45rem]">
          {vibe}
        </p>
        <p className="mt-2.5 text-[11px] font-normal leading-[1.62] text-white/74 sm:text-[12px] sm:leading-[1.65] md:leading-[1.68]">
          {feel}
        </p>
      </div>
      <p className="mt-4 border-t border-white/[0.04] pt-2.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/[0.23] tabular-nums md:mt-4 md:pt-3">
        {technical}
      </p>
    </motion.div>
  )
}
