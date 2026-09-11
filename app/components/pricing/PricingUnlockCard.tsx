"use client"

import Link from "next/link"
import { btnMastrifyPrimaryCore } from "../buttonEffects"
import { cardMastrifyPurple, cardMastrifyPurpleSheen } from "../cardEffects"
import { MASTER_PRICE_LABEL } from "../../../lib/pricing"
import { motion, useReducedMotion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

const INCLUDED = [
  "Full quality WAV export",
  "Release-ready loudness",
  "Ready for Spotify & streaming",
  "Pay only after your master is ready",
] as const

type Props = {
  className?: string
}

export default function PricingUnlockCard({ className = "" }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={`relative mx-auto w-full max-w-[26rem] ${className}`}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
    >
      <div className={`relative overflow-hidden rounded-[1.35rem] border p-8 md:p-10 ${cardMastrifyPurple}`}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/45 to-transparent"
          aria-hidden
        />
        <div className={`pointer-events-none absolute inset-0 ${cardMastrifyPurpleSheen}`} aria-hidden />

        <div className="relative text-center">
          <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
            Simple pricing
          </span>

          <h2 className="mt-5 text-[1.35rem] font-semibold tracking-[-0.02em] text-white/95 sm:text-[1.5rem]">
            Studio-quality master
          </h2>
          <p className="mx-auto mt-2.5 max-w-[18rem] text-[13px] leading-relaxed text-muted sm:text-[14px]">
            Master first, pay when your export is ready — no subscription.
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
                {MASTER_PRICE_LABEL}
              </span>
            </motion.p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-label">
              per master · no subscription
            </p>
          </div>

          <ul className="mx-auto mt-8 max-w-[17rem] space-y-2.5 text-left text-[13px] text-muted-strong sm:text-[14px]">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/master"
            className={`stable-interaction mx-auto mt-8 inline-flex min-h-[50px] min-w-[13.5rem] items-center justify-center rounded-xl px-9 text-[15px] font-semibold leading-none md:mt-9 ${btnMastrifyPrimaryCore}`}
          >
            Start mastering
          </Link>

          <p className="mt-4 text-[11px] text-muted-soft">
            Secure checkout via Stripe on the results screen after your master is generated.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
