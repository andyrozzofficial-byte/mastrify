"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import CinematicReveal from "../components/CinematicReveal"
import PremiumButton from "../components/PremiumButton"
import { FAQ } from "./faq"

const EASE = [0.22, 1, 0.36, 1] as const

export default function AiMasteringClient() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white max-lg:overflow-x-clip"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />

      <section className="marketing-hero-shell homepage-hero-shell hero-section page-container page-hero-pad relative z-10 overflow-hidden pb-12 md:pb-20">
        <motion.div
          className="marketing-hero-lockup homepage-hero-lockup relative mx-auto max-w-3xl text-center"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <span className="hero-eyebrow-pill">AI mastering online</span>
          <h1 className="mt-3.5 text-[1.75rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:mt-6 sm:text-[2.2rem] md:text-[3rem] md:leading-[1.08]">
            AI Mastering for
            <span className="mt-2 block bg-gradient-to-r from-violet-200 via-white to-violet-100/90 bg-clip-text text-transparent">
              release-ready music
            </span>
          </h1>
          <p className="hero-lead mx-auto mt-5 max-w-2xl">
            Mastrify is an online AI mastering tool for artists and producers who want streaming-ready loudness
            without flattening punch, space, or movement. Upload your mix, preview the master, and download a
            full-quality WAV when you are ready.
          </p>
          <div className="mobile-cta-stack relative z-20 mt-6 sm:mt-8">
            <PremiumButton href="/master" className="w-full sm:w-auto sm:px-9">
              Start AI mastering
            </PremiumButton>
            <PremiumButton href="/analyze" variant="secondary" className="w-full sm:w-auto sm:px-9">
              Analyze your mix first
            </PremiumButton>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 border-t border-white/[0.06]">
        <div className="page-container marketing-section-tight py-10 md:py-16">
          <CinematicReveal className="mx-auto max-w-3xl">
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.65rem]">
              How online AI mastering works
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/70 md:text-[15px]">
              Upload a stereo mix and Mastrify maps dynamics, tone, stereo balance, and energy before applying
              intelligent loudness and clarity. The chain adapts to your material — holding back when the mix is
              already balanced, and opening space only where it helps the song.
            </p>
            <ol className="mt-6 space-y-3 text-[14px] leading-relaxed text-white/68">
              <li>1. Upload your mix — no account required to begin.</li>
              <li>2. Choose loudness profile and mastering style.</li>
              <li>3. Preview before/after and pay only for the final export.</li>
            </ol>
            <p className="mt-6 text-[14px] leading-relaxed text-white/70">
              Want the full breakdown? Read{" "}
              <Link href="/how-it-works" className="text-violet-200/80 underline-offset-2 hover:underline">
                why Mastrify masters differently
              </Link>
              .
            </p>
          </CinematicReveal>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/[0.06]">
        <div className="page-container marketing-section-tight py-10 md:py-16">
          <CinematicReveal className="mx-auto max-w-3xl">
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.65rem]">
              AI audio mastering that respects your mix
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/70 md:text-[15px]">
              Generic AI music mastering can sound loud but lifeless. Mastrify is built around perceptual
              intelligence: preserving transient punch, stereo depth, and emotional movement while bringing your
              track to a confident level for Spotify, Apple Music, and other platforms.
            </p>
            <ul className="mt-6 space-y-3 text-[14px] leading-relaxed text-white/68">
              <li>Transparent dynamics instead of heavy-handed limiting.</li>
              <li>Musical loudness targets with adaptive restraint.</li>
              <li>Free mix analysis so you know what your song needs first.</li>
            </ul>
            <p className="mt-6 text-[14px] text-white/60">
              Simple pricing —{" "}
              <Link href="/pricing" className="text-violet-200/80 underline-offset-2 hover:underline">
                pay per master export
              </Link>
              , no subscription.
            </p>
          </CinematicReveal>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/[0.06] pb-16 md:pb-24">
        <div className="page-container marketing-section-tight py-10 md:py-16">
          <CinematicReveal className="mx-auto max-w-3xl">
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.65rem]">
              AI mastering FAQ
            </h2>
            <dl className="mt-6 space-y-5">
              {FAQ.map((item) => (
                <div key={item.question}>
                  <dt className="text-[15px] font-medium text-white/88">{item.question}</dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-white/68">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </CinematicReveal>
        </div>
      </section>
    </motion.div>
  )
}
