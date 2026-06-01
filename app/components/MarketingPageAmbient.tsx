"use client"

import { useReducedMotion } from "framer-motion"

type Variant = "hero" | "section"

type Props = {
  variant?: Variant
  className?: string
}

/**
 * Lightweight page-level ambient — subtle violet wash only (no blur blobs).
 */
export default function MarketingPageAmbient({ variant = "hero", className = "" }: Props) {
  const reduce = useReducedMotion()
  const pulse = reduce ? "" : "marketing-ambient-pulse"

  if (variant === "section") {
    return (
      <div
        className={`marketing-page-ambient-layer pointer-events-none absolute left-1/2 top-8 h-40 w-[min(560px,80vw)] -translate-x-1/2 rounded-full bg-indigo-600/[0.04] max-md:opacity-90 ${pulse} ${className}`}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={`marketing-page-ambient-layer pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_8%,rgba(99,102,241,0.1),transparent_58%)] ${pulse} ${className}`}
      aria-hidden
    />
  )
}
