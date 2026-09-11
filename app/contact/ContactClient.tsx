"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import SupportContactForm from "../components/contact/SupportContactForm"
import PremiumButton from "../components/PremiumButton"
import { btnMastrifySecondaryCore } from "../components/buttonEffects"

const EASE = [0.22, 1, 0.36, 1] as const

export default function ContactClient() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <main className="page-container page-hero-pad relative z-10 mx-auto w-full max-w-[720px] pb-20 pt-10 sm:pb-24 sm:pt-12 md:pb-28 md:pt-16">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto max-w-[34rem] text-center"
        >
          <span className="hero-eyebrow-pill">Support</span>
          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white/95 sm:text-[2.35rem]">
            Contact
          </h1>
          <p className="hero-lead mx-auto mt-5 max-w-lg text-center">
            Questions about mastering, exports, or billing? Send a support ticket and we will get back to you — typically
            within one business day.
          </p>
        </motion.header>

        <motion.div
          className="relative mx-auto mt-10 w-full max-w-[26rem] md:mt-12"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.06, ease: EASE }}
        >
          <div
            className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/9 via-transparent to-transparent opacity-50 blur-sm"
            aria-hidden
          />
          <SupportContactForm />
        </motion.div>

        <motion.div
          className="relative mx-auto mt-6 w-full max-w-[26rem] md:mt-8"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
        >
          <div className="rounded-[1.15rem] border border-white/[0.07] bg-white/[0.02] px-6 py-5 text-center backdrop-blur-md md:px-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Prefer email?</p>
            <a
              href="mailto:hello@mastrify.com"
              className="group/email mt-3 inline-block text-[1rem] font-medium tracking-[-0.02em] text-white/85 transition hover:text-violet-200/90"
            >
              hello@mastrify.com
            </a>
            <p className="mx-auto mt-2 max-w-[16rem] text-[12px] leading-relaxed text-white/45">
              Backup option if the form is unavailable.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="mx-auto mt-12 flex flex-col items-center gap-3 md:mt-14"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
        >
          <PremiumButton href="/master" className="min-h-[52px] min-w-[13.5rem] px-9">
            Start mastering
          </PremiumButton>
          <Link
            href="/pricing"
            className={`inline-flex min-h-[48px] min-w-[13.5rem] items-center justify-center rounded-xl px-9 text-[14px] font-medium text-muted-strong ${btnMastrifySecondaryCore}`}
          >
            View pricing
          </Link>
        </motion.div>

        <p className="mx-auto mt-12 max-w-sm text-center text-[11px] leading-relaxed text-white/36 md:mt-14">
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
