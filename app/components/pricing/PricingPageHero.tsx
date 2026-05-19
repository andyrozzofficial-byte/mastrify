"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import { MarketingHeroOrbSlot } from "../HeroEngineOrb"

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
    <section className="marketing-hero-shell hero-section page-hero-pad relative z-10 w-full">
      <div
        className="marketing-ambient-pulse pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <motion.div
        className="marketing-hero-lockup relative grid gap-5 max-md:gap-6 sm:gap-10"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <motion.div className="marketing-hero-copy pricing-hero-copy flex flex-col lg:text-left">
          <span className="hero-eyebrow-pill">Simple, honest pricing</span>

          <h1 className="marketing-hero-title mt-4 text-[1.4rem] font-semibold leading-[1.2] tracking-[-0.028em] text-white min-[390px]:text-[1.48rem] sm:mt-6 sm:text-[2rem] sm:leading-[1.14] md:leading-[1.12]">
            <span className="block">One master.</span>
            <span className="mt-1.5 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent md:mt-1">
              Full quality. No complexity.
            </span>
          </h1>

          <p className="hero-lead">
            Release-ready mastering without subscriptions — master your track first, then pay when you are ready to
            export, powered by the same cinematic engine as the rest of Mastrify.
          </p>

          <ul className="marketing-hero-bullets mt-5 space-y-2.5 text-[14px] leading-[1.55] text-white/70 sm:mt-6 sm:space-y-2.5">
            {BULLETS.map((text) => (
              <li key={text} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[13px] text-white/64 sm:mt-6">
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

        <MarketingHeroOrbSlot activeStep={engineStep} />
      </motion.div>
    </section>
  )
}
