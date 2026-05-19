"use client"

import Link from "next/link"
import MarketingActionSlot from "../cinematic/MarketingActionSlot"
import MarketingDesktopHero from "../cinematic/MarketingDesktopHero"
import PricingUnlockCard from "./PricingUnlockCard"

const BULLETS = [
  "Pay per export — only after your master is ready",
  "No subscriptions or hidden tiers",
  "Full-quality WAV with streaming-ready loudness",
] as const

export default function PricingPageHero() {
  return (
    <MarketingDesktopHero variant="product">
      <span className="hero-eyebrow-pill">Simple, honest pricing</span>

      <h1 className="marketing-hero-title">
        One master.
        <span className="marketing-hero-title-accent">Full quality. No complexity.</span>
      </h1>

      <p className="hero-lead lg:mx-0">
        Release-ready mastering without subscriptions — master your track first, then pay when you are ready to export,
        powered by the same cinematic engine as the rest of Mastrify.
      </p>

      <ul className="marketing-hero-bullets">
        {BULLETS.map((text) => (
          <li key={text} className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
            {text}
          </li>
        ))}
      </ul>

      <MarketingActionSlot>
        <PricingUnlockCard />
      </MarketingActionSlot>

      <p className="marketing-hero-footer-note">
        <Link
          href="/master"
          className="transition hover:text-violet-200/70 hover:underline hover:underline-offset-2"
        >
          Start mastering
        </Link>
        <span className="mx-2 text-white/48">·</span>
        <Link href="/how-it-works" className="transition hover:text-white/75 hover:underline hover:underline-offset-2">
          Why Mastrify
        </Link>
      </p>
    </MarketingDesktopHero>
  )
}
