"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

const INCLUDED = [
  "Full quality WAV export",
  "Release-ready loudness",
  "Ready for Spotify & streaming",
  "Pay only after your master is ready",
] as const

export default function PricingUnlockCard() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="cinematic-upload-card-root fluid-surface relative w-full"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
    >
      <motion.div
        className="cinematic-upload-card-glow pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-500/15 blur-sm"
        aria-hidden
      />

      <div className="cinematic-upload-card-panel marketing-panel-card relative overflow-hidden p-3.5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/28 to-transparent"
          aria-hidden
        />

        <div className="relative text-center">
          <span className="hero-eyebrow-pill !mx-auto">Simple pricing</span>

          <h2 className="mt-4 text-[1rem] font-semibold tracking-[-0.02em] text-white/95 sm:text-[1.05rem]">
            Studio-quality master
          </h2>
          <p className="mx-auto mt-2 max-w-[18rem] text-[12px] leading-relaxed text-white/64">
            Master first, pay when your export is ready — no subscription.
          </p>

          <p className="mt-6 text-[3.25rem] font-semibold tabular-nums leading-none tracking-[-0.04em] text-white sm:text-[3.75rem]">
            <span className="bg-gradient-to-b from-white via-violet-100 to-violet-200/85 bg-clip-text text-transparent">
              $9
            </span>
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
            per master · no subscription
          </p>

          <ul className="mx-auto mt-6 max-w-[17rem] space-y-2.5 text-left text-[12px] text-white/70 sm:text-[13px]">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="marketing-upload-actions !mt-6 border-t-0 pt-0">
            <Link href="/master" className="marketing-upload-btn-primary">
              Start mastering
            </Link>
            <p className="text-center text-[11px] text-white/58">
              Payment is collected on the results screen after your master is generated.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
