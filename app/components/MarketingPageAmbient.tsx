"use client"

import { useReducedMotion } from "framer-motion"

type Variant = "hero" | "section"

type Props = {
  variant?: Variant
  className?: string
}

/**
 * Lightweight page-level ambient glow (opacity-only CSS animation).
 * Replaces heavy Framer + blur-[100px] layers on marketing routes.
 */
export default function MarketingPageAmbient({ variant = "hero", className = "" }: Props) {
  const reduce = useReducedMotion()
  const pulse = reduce ? "" : "marketing-ambient-pulse"

  if (variant === "section") {
    return (
      <div
        className={`pointer-events-none absolute left-1/2 top-8 h-40 w-[min(560px,80vw)] -translate-x-1/2 rounded-full bg-indigo-600/[0.04] max-md:opacity-90 md:blur-3xl ${pulse} ${className}`}
        aria-hidden
      />
    )
  }

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_8%,rgba(99,102,241,0.12),transparent_58%),radial-gradient(ellipse_50%_40%_at_85%_75%,rgba(34,211,238,0.05),transparent_50%)] marketing-page-ambient-layer ${pulse} ${className}`}
        aria-hidden
      />
      <div
        className={`marketing-page-ambient-blur pointer-events-none absolute left-1/2 top-[10%] h-[min(420px,55vw)] w-[min(560px,82vw)] -translate-x-1/2 rounded-full bg-violet-600/[0.06] max-md:opacity-90 max-md:blur-2xl md:blur-3xl ${pulse}`}
        aria-hidden
      />
    </>
  )
}
