"use client"

import { motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import CinematicBackground from "../components/CinematicBackground"
import MarketingPageAmbient from "../components/MarketingPageAmbient"
import CinematicDivider from "../components/CinematicDivider"
import CinematicReveal from "../components/CinematicReveal"
import MarketingDesktopHero from "../components/cinematic/MarketingDesktopHero"
import PremiumButton from "../components/PremiumButton"

const EASE = [0.22, 1, 0.36, 1] as const

const dawLogos = ["Ableton Live", "FL Studio", "Logic Pro", "Pro Tools", "Studio One"]

export default function Landing() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <CinematicBackground intensity="strong" marketingLite />

      <MarketingPageAmbient />

      <MarketingDesktopHero>
        <span className="hero-eyebrow-pill">Intelligent mastering engine</span>

        <h1 className="marketing-hero-title">
          Music shaped for release
          <span className="marketing-hero-title-accent">with musical depth</span>
        </h1>

        <p className="hero-lead lg:mx-0">
          Mastrify masters with perceptual intelligence — preserving punch, space, and emotional movement while bringing
          your mix to a confident, streaming-ready level.
        </p>

        <ul className="marketing-hero-bullets">
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
          className="mobile-cta-stack marketing-hero-cta"
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

        <p className="marketing-hero-footer-note">
          <Link
            href="/how-it-works"
            className="transition hover:text-violet-200/70 hover:underline hover:underline-offset-2"
          >
            Why Mastrify
          </Link>
          <span className="mx-2 text-white/48">·</span>
          No signup required to begin
        </p>
      </MarketingDesktopHero>

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
        <MarketingPageAmbient variant="section" />

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
