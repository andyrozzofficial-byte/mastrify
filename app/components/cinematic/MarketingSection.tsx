"use client"

import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
  /** Adds top border like homepage section transitions */
  bordered?: boolean
  /** Uses section-after-hero spacing (first block below hero) */
  afterHero?: boolean
}

/** Contained interior section — always within page-container max-width. */
export default function MarketingSection({
  children,
  className = "",
  bordered = false,
  afterHero = false,
}: Props) {
  return (
    <section
      className={[
        "page-container marketing-section relative z-10",
        afterHero ? "section-after-hero" : "section-rhythm",
        bordered ? "border-t border-white/[0.05]" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  )
}
