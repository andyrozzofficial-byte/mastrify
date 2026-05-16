"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import HeroEngineOrb from "../HeroEngineOrb"

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
          <span className="hero-eyebrow-pill">Simple, honest pricing</span>

          <h1 className="mt-3.5 text-[1.6rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:mt-6 sm:text-[2rem] md:text-[2.65rem] md:leading-[1.12]">
            One master.
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
              Full quality. No complexity.
            </span>
          </h1>

          <p className="hero-lead md:mt-6">
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

        <HeroEngineOrb activeStep={engineStep} className="lg:justify-self-end" />
      </motion.div>
    </section>
  )
}
