"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  onCreateAnother: () => void
}

export default function BetaFeedbackSuccessPanel({ onCreateAnother }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex flex-col items-center px-4 py-8 text-center sm:py-9"
    >
      <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
        <span className="text-emerald-300/95" aria-hidden>
          ✓{" "}
        </span>
        Thanks for helping improve Mastrify
      </p>

      <p className="mt-3 text-[13px] font-semibold text-violet-200/90">+1 Insider point earned</p>
      <p className="mt-1 max-w-sm text-[12px] leading-snug text-white/50">
        Your progress updates in the Insider card above.
      </p>

      <Link
        href="/master"
        onClick={onCreateAnother}
        className="mt-7 inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-6 text-[15px] font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.14)] transition hover:brightness-[1.06] active:scale-[0.99]"
      >
        Create another master
      </Link>
    </motion.div>
  )
}
