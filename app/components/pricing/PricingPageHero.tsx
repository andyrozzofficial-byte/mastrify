"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import HeroWaveBackdrop from "../HeroWaveBackdrop"
import LandingHeroAtmosphere from "../LandingHeroAtmosphere"
import MasteringEngineVisual from "../../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

const BULLETS = [
  "Pay per export — only after your master is ready",
  "No subscriptions or hidden tiers",
  "Full-quality WAV with streaming-ready loudness",
] as const

export default function PricingPageHero() {
  const reduce = useReducedMotion()
  const [engineStep, setEngineStep] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setEngineStep((s) => (s + 1) % 5), 4000)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <section className="relative w-full">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14 xl:gap-16"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <motion.div className="flex flex-col">
          <span className="inline-flex w-fit rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70 backdrop-blur-md">
            Simple, honest pricing
          </span>

          <h1 className="mt-4 text-[1.6rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:mt-6 sm:text-[2rem] md:text-[2.65rem] md:leading-[1.12]">
            One master.
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
              Full quality. No complexity.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-[15px] leading-[1.65] text-white/74 md:text-[16px] md:leading-[1.7]">
            Release-ready mastering without subscriptions — master your track first, then pay when you are ready to
            export, powered by the same cinematic engine as the rest of Mastrify.
          </p>

          <ul className="mt-6 space-y-2.5 text-[14px] text-white/70">
            {BULLETS.map((text) => (
              <li key={text} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-[13px] text-white/64">
            <Link
              href="/master"
              className="text-violet-200/55 underline-offset-2 transition hover:text-violet-200/80 hover:underline"
            >
              Start mastering
            </Link>
            <span className="mx-2 text-white/48">·</span>
            <Link
              href="/how-it-works"
              className="text-white/60 underline-offset-2 transition hover:text-white/82 hover:underline"
            >
              Why Mastrify
            </Link>
          </p>
        </motion.div>

        <motion.div
          className="relative mx-auto flex w-full max-w-[24rem] justify-center lg:max-w-none lg:justify-end"
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.08, ease: EASE }}
        >
          <LandingHeroAtmosphere />
          <motion.div className="relative w-full max-w-[min(22rem,88vw)] lg:max-w-[26rem]">
            <HeroWaveBackdrop heightClass="h-[38%]" className="opacity-[0.2]" />
            <motion.div
              className="pointer-events-none absolute inset-x-[8%] bottom-[4%] h-[32%] opacity-[0.12]"
              aria-hidden
              animate={reduce ? undefined : { opacity: [0.08, 0.16, 0.08] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="pricingHeroSpec" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(139,92,246,0)" />
                    <stop offset="45%" stopColor="rgba(139,92,246,0.45)" />
                    <stop offset="75%" stopColor="rgba(56,189,248,0.4)" />
                    <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                  </linearGradient>
                </defs>
                <motion.path
                  fill="none"
                  stroke="url(#pricingHeroSpec)"
                  strokeWidth="1.5"
                  d="M0,42 Q50,28 100,40 T200,38 T300,44 T400,36"
                  animate={
                    reduce
                      ? undefined
                      : {
                          d: [
                            "M0,42 Q50,28 100,40 T200,38 T300,44 T400,36",
                            "M0,40 Q50,34 100,38 T200,42 T300,40 T400,38",
                            "M0,42 Q50,28 100,40 T200,38 T300,44 T400,36",
                          ],
                        }
                  }
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>
            <MasteringEngineVisual
              activeStep={engineStep}
              className="relative z-[1] mx-auto w-[min(19rem,85vw)] max-w-[22rem] md:w-[min(21rem,38vw)] md:max-w-[24rem]"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
