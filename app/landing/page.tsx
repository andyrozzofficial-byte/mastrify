"use client"

import { motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { useEffect, useState } from "react"
import CinematicBackground from "../components/CinematicBackground"
import CinematicDivider from "../components/CinematicDivider"
import CinematicReveal from "../components/CinematicReveal"
import HeroWaveBackdrop from "../components/HeroWaveBackdrop"
import LandingHeroAtmosphere from "../components/LandingHeroAtmosphere"
import PremiumButton from "../components/PremiumButton"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

const dawLogos = ["Ableton", "FL Studio", "Logic Pro", "Pro Tools", "Studio One"]

export default function Landing() {
  const reduce = useReducedMotion()
  const [engineStep, setEngineStep] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => {
      setEngineStep((s) => (s + 1) % 5)
    }, 4000)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />

      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_6%,rgba(99,102,241,0.14),transparent_58%),radial-gradient(ellipse_50%_40%_at_88%_70%,rgba(34,211,238,0.06),transparent_50%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.92, 1, 0.92] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="pointer-events-none absolute left-1/2 top-[12%] h-[min(520px,62vw)] w-[min(680px,88vw)] -translate-x-1/2 rounded-full bg-violet-600/[0.06] blur-[100px]"
        animate={reduce ? undefined : { opacity: [0.45, 0.68, 0.45], scale: [1, 1.03, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      {/* Hero */}
      <section className="page-container page-hero-pad relative z-10 pb-10 md:pb-12">
        <motion.div
          className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-14 xl:gap-16"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <motion.div
            className="text-center lg:max-w-xl lg:text-left"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: EASE }}
          >
            <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70 backdrop-blur-md">
              Intelligent mastering engine
            </span>

            <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2.65rem] md:text-[3.1rem] md:leading-[1.08] lg:mt-7">
              Music shaped for release
              <span className="mt-2 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
                with musical depth
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-white/74 md:text-[16px] md:leading-relaxed lg:mx-0">
              Mastrify masters with perceptual intelligence — preserving punch, space, and emotional movement while
              bringing your mix to a confident, streaming-ready level.
            </p>

            <ul className="mx-auto mt-7 max-w-md space-y-3 text-left text-[14px] leading-[1.55] text-white/70 lg:mx-0">
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
                Transparent dynamics that respect what your mix already does well
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
                Loudness and tone guided with restraint — not brute-force processing
              </li>
            </ul>

            <motion.div
              className="mx-auto mt-10 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
            >
              <PremiumButton href="/master" className="flex-1 sm:flex-none sm:px-9">
                Start mastering
              </PremiumButton>
              <PremiumButton href="/analyze" variant="secondary" className="flex-1 sm:flex-none sm:px-9">
                Analyze your mix
              </PremiumButton>
            </motion.div>

            <p className="mt-5 text-center text-[13px] text-white/64 lg:text-left">
              <Link
                href="/how-it-works"
                className="transition hover:text-violet-200/70 hover:underline hover:underline-offset-2"
              >
                Why Mastrify
              </Link>
              <span className="mx-2 text-white/48">·</span>
              No signup required to begin
            </p>
          </motion.div>

          <div className="relative mx-auto flex w-full max-w-[26rem] justify-center lg:max-w-none lg:justify-end">
            <LandingHeroAtmosphere />
            <motion.div
              className="relative w-full max-w-[min(24rem,92vw)] lg:max-w-[28rem]"
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.12, ease: EASE }}
            >
              <HeroWaveBackdrop heightClass="h-[42%]" className="opacity-[0.22]" />
              <motion.div
                className="pointer-events-none absolute inset-x-[6%] bottom-[2%] h-[38%] opacity-[0.14]"
                aria-hidden
                animate={reduce ? undefined : { opacity: [0.1, 0.18, 0.1] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="landingSpec" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(139,92,246,0)" />
                      <stop offset="35%" stopColor="rgba(139,92,246,0.5)" />
                      <stop offset="65%" stopColor="rgba(56,189,248,0.45)" />
                      <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    fill="none"
                    stroke="url(#landingSpec)"
                    strokeWidth="1.5"
                    d="M0,42 Q50,28 100,40 T200,38 T300,44 T400,36"
                    animate={reduce ? undefined : { d: ["M0,42 Q50,28 100,40 T200,38 T300,44 T400,36", "M0,40 Q50,34 100,38 T200,42 T300,40 T400,38", "M0,42 Q50,28 100,40 T200,38 T300,44 T400,36"] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </motion.div>
              <MasteringEngineVisual
                activeStep={engineStep}
                className="relative z-[1] mx-auto w-[min(22rem,88vw)] max-w-[26rem] md:w-[min(24rem,42vw)] md:max-w-[28rem]"
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Bridge — tightens hero → below fold */}
      <motion.div
        className="relative z-10 mx-auto max-w-[1080px] px-5 md:px-10"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={reduce ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <CinematicDivider />
      </motion.div>

      {/* Below fold — mix intelligence */}
      <section className="relative z-10">
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent via-violet-950/[0.12] to-transparent"
          aria-hidden
          animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/2 top-8 h-48 w-[min(640px,80vw)] -translate-x-1/2 rounded-full bg-indigo-600/[0.04] blur-[80px]"
          aria-hidden
          animate={reduce ? undefined : { opacity: [0.3, 0.55, 0.3], y: [0, 6, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="page-container relative z-10 pt-14 pb-20 md:pt-16 md:pb-24"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <CinematicReveal className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/45">Before you master</p>
            <h2 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.75rem]">
              Understand your mix with clarity
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/70 md:text-[15px]">
              Perceptual analysis highlights dynamics, balance, and release readiness — so you know what your song
              needs before the final master.
            </p>
            <PremiumButton href="/analyze" variant="secondary" className="mt-7 min-h-[48px] px-8">
              Run a free mix analysis
            </PremiumButton>
          </CinematicReveal>

          <CinematicReveal className="mx-auto mt-14 max-w-[920px] md:mt-16" delay={0.08}>
            <CinematicDivider className="mb-10" />
            <p className="text-center text-[12px] tracking-wide text-white/60 md:text-[13px]">
              Trusted by producers and artists worldwide
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
              {dawLogos.map((name, i) => (
                <motion.li
                  key={name}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.04 * i, ease: EASE }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/54 md:text-[11px]">
                    {name}
                  </span>
                </motion.li>
              ))}
            </ul>
          </CinematicReveal>
        </motion.div>
      </section>
    </motion.div>
  )
}
