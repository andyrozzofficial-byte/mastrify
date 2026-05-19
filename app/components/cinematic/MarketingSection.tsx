"use client"

import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
  /** Adds top border like homepage section transitions */
  bordered?: boolean
  /** Uses section-after-hero spacing (first block below hero) */
  afterHero?: boolean
  /** Tighter vertical padding between sections */
  compact?: boolean
  /** Less gap after hero (pricing, landing-adjacent blocks) */
  tightAfterHero?: boolean
  /** Centers content in editorial max-width (landing trust band rhythm) */
  contained?: boolean
}

/** Contained interior section — always within page-container max-width. */
export default function MarketingSection({
  children,
  className = "",
  bordered = false,
  afterHero = false,
  compact = false,
  tightAfterHero = false,
  contained = false,
}: Props) {
  return (
    <section
      className={[
        "page-container marketing-section relative z-10",
        afterHero ? "section-after-hero" : "section-rhythm",
        afterHero && tightAfterHero ? "section-after-hero--tight" : "",
        compact ? "section-rhythm--compact" : "",
        bordered ? "border-t border-white/[0.05]" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {contained ? <div className="marketing-interior">{children}</div> : children}
    </section>
  )
}
