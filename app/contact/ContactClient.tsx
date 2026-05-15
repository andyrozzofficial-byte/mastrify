"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import PremiumButton from "../components/PremiumButton"

const EASE = [0.22, 1, 0.36, 1] as const

export default function ContactClient() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <main className="relative z-10 mx-auto flex w-full max-w-[640px] flex-col px-5 pb-14 pt-8 md:px-10 md:pb-16 md:pt-10">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
            Support
          </span>
          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white/95 sm:text-[2.25rem]">
            Contact
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted md:text-[16px]">
            Questions about mastering, exports, or your account? We are here to help — typically within one business day.
          </p>
        </motion.header>

        <motion.div
          className="mt-10 rounded-xl border border-white/[0.09] bg-gradient-to-b from-white/[0.04] to-black/[0.4] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_48px_rgba(0,0,0,0.35)] backdrop-blur-md md:mt-12 md:p-8"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-label-strong">Email</p>
          <a
            href="mailto:support@mastrify.com"
            className="mt-3 inline-block text-[1.1rem] font-medium tracking-[-0.01em] text-white/90 transition hover:text-violet-200/90"
          >
            support@mastrify.com
          </a>
          <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
            Include your track name and a short description of the issue. For export or payment questions, mention when
            you completed your master.
          </p>
        </motion.div>

        <motion.div
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <PremiumButton href="/master" className="w-full sm:w-auto sm:min-w-[200px]">
            Start mastering
          </PremiumButton>
          <Link
            href="/pricing"
            className="text-[13px] text-muted-strong underline-offset-2 transition hover:text-white/85 hover:underline"
          >
            View pricing
          </Link>
        </motion.div>
      </main>
    </motion.div>
  )
}
