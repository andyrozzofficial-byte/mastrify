"use client"

import { motion, useReducedMotion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

const INCLUDED = [
  "Full quality WAV export",
  "Release-ready loudness",
  "Ready for Spotify & streaming",
] as const

type Props = {
  onUnlock: () => void
  className?: string
}

export default function PricingUnlockCard({ onUnlock, className = "" }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={`relative mx-auto w-full max-w-[26rem] ${className}`}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-[1.4rem] bg-gradient-to-br from-violet-500/18 via-transparent to-cyan-500/10 opacity-60 blur-sm"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.11] bg-gradient-to-b from-white/[0.05] to-black/[0.78] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(167,139,250,0.1),0_24px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:p-10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/28 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-violet-600/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 left-1/2 h-28 w-52 -translate-x-1/2 rounded-full bg-cyan-500/[0.04] blur-3xl"
          aria-hidden
        />

        <div className="relative text-center">
          <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
            Full export unlock
          </span>

          <h2 className="mt-5 text-[1.35rem] font-semibold tracking-[-0.02em] text-white/95 sm:text-[1.5rem]">
            Studio-quality master
          </h2>
          <p className="mx-auto mt-2.5 max-w-[16rem] text-[13px] leading-relaxed text-muted sm:text-[14px]">
            Pay only for the master you export. One simple unlock.
          </p>

          <div className="relative mt-8 md:mt-9">
            <motion.p
              className="text-[4rem] font-semibold tabular-nums leading-none tracking-[-0.04em] text-white sm:text-[4.5rem]"
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            >
              <span className="bg-gradient-to-b from-white via-violet-100 to-violet-200/85 bg-clip-text text-transparent">
                $9
              </span>
            </motion.p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-label">
              per master · no subscription
            </p>
          </div>

          <ul className="mx-auto mt-8 max-w-[15rem] space-y-2.5 text-left text-[13px] text-muted-strong sm:text-[14px]">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onUnlock}
            className="group/btn relative mt-8 w-full overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-8 py-4 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.1] transition-[filter,box-shadow] duration-300 hover:brightness-[1.05] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_44px_rgba(0,0,0,0.42),0_0_28px_rgba(99,102,241,0.14)] md:mt-9"
          >
            <span
              className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-[120%]"
              aria-hidden
            />
            <span className="relative z-[1]">Pay &amp; unlock</span>
          </button>

          <p className="mt-4 text-[11px] text-muted-soft">Test mode — no real payment yet</p>
        </div>
      </div>
    </motion.div>
  )
}
