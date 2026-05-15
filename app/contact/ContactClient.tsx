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

      <main className="page-container relative z-10 mx-auto flex w-full max-w-[600px] flex-col pb-16 pt-8 sm:pb-20 sm:pt-10 md:pb-28 md:pt-16">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto max-w-[34rem] text-center"
        >
          <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
            Support
          </span>
          <h1 className="mt-7 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white/95 sm:text-[2.35rem]">
            Contact
          </h1>
          <p className="mx-auto mt-6 text-[16px] leading-[1.72] text-muted md:text-[17px] md:leading-[1.78]">
            Questions about mastering, exports, or billing? We typically reply within one business day.
          </p>
        </motion.header>

        <motion.div
          className="relative mx-auto mt-14 w-full max-w-[26rem] md:mt-16"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.06, ease: EASE }}
        >
          <div
            className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/18 via-transparent to-cyan-500/10 opacity-60 blur-sm"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.11] bg-gradient-to-b from-white/[0.05] to-black/[0.78] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(167,139,250,0.1),0_24px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:px-8 md:py-9">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/28 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-600/[0.07] blur-3xl"
              aria-hidden
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-label-strong">Email</p>
            <a
              href="mailto:hello@mastrify.com"
              className="group/email mt-4 inline-block text-[1.2rem] font-medium tracking-[-0.02em] text-white/92 transition duration-300 hover:text-violet-200/90 sm:text-[1.35rem]"
            >
              <span className="relative">
                hello@mastrify.com
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-violet-300/60 transition-all duration-300 group-hover/email:w-full" />
              </span>
            </a>
            <p className="mx-auto mt-5 max-w-[16rem] text-[14px] leading-[1.7] text-muted">
              Include your track name and a short note. For export or payment help, mention when you completed your
              master.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="mx-auto mt-14 flex flex-col items-center gap-3 md:mt-16"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
        >
          <PremiumButton href="/master" className="min-h-[52px] min-w-[13.5rem] px-9">
            Start mastering
          </PremiumButton>
          <Link
            href="/pricing"
            className="inline-flex min-h-[48px] min-w-[13.5rem] items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-9 text-[14px] font-medium text-muted-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04] transition duration-300 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/88"
          >
            View pricing
          </Link>
        </motion.div>

        <p className="mx-auto mt-14 max-w-sm text-center text-[11px] leading-relaxed text-white/36 md:mt-16">
          Prefer to explore first?{" "}
          <Link href="/how-it-works" className="text-white/48 underline-offset-2 hover:text-violet-200/70 hover:underline">
            See how Mastrify works
          </Link>
          .
        </p>
      </main>
    </motion.div>
  )
}
