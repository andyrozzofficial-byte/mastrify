"use client"

import type { ReactNode } from "react"
import { useReducedMotion } from "framer-motion"
import CinematicBackground from "../CinematicBackground"
import MarketingPageAmbient from "../MarketingPageAmbient"
import { useMarketingScrollPause } from "../../../lib/useMarketingScrollPause"
import "./marketing-hero-perf.css"
import "./landing-scroll-safe.css"

type Props = {
  children: ReactNode
  showBottomFade?: boolean
  innerClassName?: string
  /** Landing: minimal layers, no page ambient pulse, scroll-safe overflow */
  scrollSafe?: boolean
}

/** Canonical marketing page shell — matches homepage root structure. */
export default function MarketingPageFrame({
  children,
  showBottomFade = false,
  innerClassName = "",
  scrollSafe = false,
}: Props) {
  const reduce = useReducedMotion()
  useMarketingScrollPause()

  const enterClass =
    scrollSafe || reduce ? "" : "marketing-page-root--enter"

  return (
    <div
      className={`marketing-page-root relative min-h-0 text-white ${enterClass} ${
        scrollSafe ? "marketing-page-root--scroll-safe overflow-x-clip" : "min-h-screen overflow-x-clip"
      }`}
    >
      <CinematicBackground intensity="strong" marketingLite gradientOnly />
      {scrollSafe ? null : <MarketingPageAmbient />}

      {showBottomFade ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-violet-950/[0.08] to-transparent"
          aria-hidden
        />
      ) : null}

      <div className={`relative z-10 ${innerClassName}`.trim()}>{children}</div>
    </div>
  )
}
