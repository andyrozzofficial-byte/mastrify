"use client"

import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
}

/** Shared width + rhythm for upload cards, pricing panel, and hero CTAs. */
export default function MarketingActionSlot({ children, className = "" }: Props) {
  return <div className={`marketing-hero-action-slot ${className}`.trim()}>{children}</div>
}
