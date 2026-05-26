"use client"

import Link from "next/link"
import CinematicDivider from "../components/CinematicDivider"
import MarketingDesktopHero from "../components/cinematic/MarketingDesktopHero"
import MarketingPageFrame from "../components/cinematic/MarketingPageFrame"
import PremiumButton from "../components/PremiumButton"

export default function Landing() {
  return (
    <MarketingPageFrame scrollSafe>
      <MarketingDesktopHero variant="marketing" scrollSafe>
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

        <div className="mobile-cta-stack marketing-hero-cta">
          <PremiumButton href="/master" gateMastering className="w-full sm:w-auto sm:px-9">
            Start mastering
          </PremiumButton>
          <PremiumButton href="/analyze" variant="secondary" className="w-full sm:w-auto sm:px-9">
            Analyze your mix
          </PremiumButton>
        </div>

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

      <div className="page-container relative z-10 lg:-mt-2">
        <CinematicDivider />
      </div>

      <section className="section-after-hero relative z-10">
        <div className="page-container landing-close-footer marketing-section-tight relative z-10 pt-5 md:pt-16 lg:pt-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/45">Before you master</p>
            <h2 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.75rem]">
              Understand your mix with clarity
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/70 md:text-[15px]">
              Perceptual analysis highlights dynamics, balance, and release readiness — so you know what your song needs
              before the final master.
            </p>
            <PremiumButton href="/analyze" variant="secondary" className="mt-5 min-h-[48px] px-8 sm:mt-7">
              Run a free mix analysis
            </PremiumButton>
          </div>

        </div>
      </section>
    </MarketingPageFrame>
  )
}
