"use client"

import dynamic from "next/dynamic"
import { motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { useEffect, useState } from "react"
import CinematicBackground from "../components/CinematicBackground"
import CinematicDivider from "../components/CinematicDivider"
import CinematicReveal from "../components/CinematicReveal"
import PremiumButton from "../components/PremiumButton"

const MarketingHeroOrb = dynamic(() => import("../components/MarketingHeroOrb"), { ssr: false })

const EASE = [0.22, 1, 0.36, 1] as const

const dawLogos = ["Ableton Live", "FL Studio", "Logic Pro", "Pro Tools", "Studio One"]

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
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white max-lg:overflow-x-clip"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_6%,rgba(99,102,241,0.045),transparent_58%)]"
        aria-hidden
      />

      {/* Hero */}
      <section className="marketing-hero-shell homepage-hero-shell hero-section page-container page-hero-pad relative z-10 sm:pb-10 md:pb-12">
        <motion.div
          className="marketing-hero-lockup homepage-hero-lockup relative grid items-center gap-6 sm:gap-10"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <motion.div
            className="marketing-hero-copy text-center lg:text-left"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: EASE }}
          >
            <span className="hero-eyebrow-pill">Intelligent mastering engine</span>

            <h1 className="mt-3.5 text-[1.65rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:mt-6 sm:text-[2.1rem] md:text-[3.1rem] md:leading-[1.08] lg:mt-7 lg:text-[2.65rem]">
              Music shaped for release
              <span className="mt-2 block bg-gradient-to-r from-violet-200 via-white to-violet-100/90 bg-clip-text text-transparent">
                with musical depth
              </span>
            </h1>

            <MarketingHeroOrb
              activeStep={engineStep}
              breakpoint="mobile-only"
              className="homepage-hero-orb-mobile mx-auto my-3 w-full max-w-[min(13.5rem,calc(100vw-3rem))] overflow-x-clip sm:my-4"
            />

            <p className="hero-lead lg:mx-0">
              Mastrify masters with perceptual intelligence — preserving punch, space, and emotional movement while
              bringing your mix to a confident, streaming-ready level.
            </p>

            <ul className="mx-auto mt-5 max-w-md space-y-2.5 text-left text-[14px] leading-[1.55] text-white/70 sm:mt-7 sm:space-y-3 lg:mx-0">
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
                Transparent dynamics that respect what your mix already does well
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/50" aria-hidden />
                Loudness and tone guided with restraint — not brute-force processing
              </li>
            </ul>

            <motion.div
              className="mobile-cta-stack relative z-20 mt-4 sm:mt-8 lg:justify-start"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
            >
              <PremiumButton href="/master" className="w-full sm:w-auto sm:px-9">
                Start mastering
              </PremiumButton>
              <PremiumButton href="/analyze" variant="secondary" className="w-full sm:w-auto sm:px-9">
                Analyze your mix
              </PremiumButton>
            </motion.div>

            <p className="mt-4 text-center text-[13px] text-support-68 sm:mt-5 lg:text-left">
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

          <MarketingHeroOrb activeStep={engineStep} breakpoint="md-up" />
        </motion.div>
      </section>

      {/* Bridge — tightens hero → below fold */}
      <motion.div
        className="relative z-10 mx-auto max-w-[1080px] px-5 md:px-10 lg:-mt-2"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={reduce ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <CinematicDivider />
      </motion.div>

      {/* Below fold — mix intelligence */}
      <section className="section-after-hero relative z-10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent via-violet-950/[0.08] to-transparent"
          aria-hidden
        />

        <motion.div
          className="page-container landing-close-footer marketing-section-tight relative z-10 pt-5 md:pt-16 lg:pt-8"
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
            <PremiumButton href="/analyze" variant="secondary" className="mt-5 min-h-[48px] px-8 sm:mt-7">
              Run a free mix analysis
            </PremiumButton>
          </CinematicReveal>

          <CinematicReveal className="mx-auto mt-10 max-w-[920px] sm:mt-14 md:mt-[3.75rem] lg:mt-10" delay={0.08}>
            <motion.div
              className="trust-band"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-24px" }}
              transition={{ duration: 0.65, ease: EASE }}
            >
              <p className="trust-band-kicker">Seamless with your studio</p>
              <h3 className="trust-band-heading">Trusted by producers and artists worldwide</h3>
              <div className="trust-daw-row" aria-label="Supported digital audio workstations">
                <motion.ul className="trust-daw-list">
                  {dawLogos.map((name, i) => (
                    <motion.li
                      key={name}
                      className="trust-daw-item"
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.04 * i, ease: EASE }}
                    >
                      <span className="trust-daw-label">{name}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </motion.div>
          </CinematicReveal>
        </motion.div>
      </section>
    </motion.div>
  )
}
