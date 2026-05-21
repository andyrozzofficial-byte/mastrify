"use client"

import type { ReactNode } from "react"
import { useReducedMotion } from "framer-motion"
import CinematicBackground from "../CinematicBackground"
import MarketingPageAmbient from "../MarketingPageAmbient"
import { useMarketingScrollPause } from "../../../lib/useMarketingScrollPause"
import "./marketing-hero-perf.css"

type Props = {
  children: ReactNode
  showBottomFade?: boolean
  innerClassName?: string
}

/** Canonical marketing page shell — matches homepage root structure. */
export default function MarketingPageFrame({
  children,
  showBottomFade = false,
  innerClassName = "",
}: Props) {
  const reduce = useReducedMotion()
  useMarketingScrollPause()

  return (
    <div
      className={`marketing-page-root relative min-h-screen overflow-x-clip text-white ${
        reduce ? "" : "marketing-page-root--enter"
      }`}
    >
      <CinematicBackground intensity="strong" marketingLite gradientOnly />
      <MarketingPageAmbient />

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
