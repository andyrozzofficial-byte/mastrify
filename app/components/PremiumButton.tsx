"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { btnPrimaryVertical, btnSecondary } from "./buttonEffects"

type Variant = "primary" | "secondary"

const styles: Record<Variant, string> = {
  primary: `bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 text-white ${btnPrimaryVertical.shadow} ${btnPrimaryVertical.ring} ${btnPrimaryVertical.hover}`,
  secondary: `border border-white/[0.1] bg-white/[0.035] text-white/85 ${btnSecondary.shadow} ${btnSecondary.ring} hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white ${btnSecondary.hover}`,
}

type Props = ComponentProps<typeof Link> & {
  variant?: Variant
}

export default function PremiumButton({
  variant = "primary",
  className = "",
  children,
  prefetch = false,
  ...props
}: Props) {
  return (
    <Link
      prefetch={prefetch}
      className={`safari-nav-link group relative inline-flex min-h-[48px] max-w-full min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-xl px-6 text-center text-[13px] font-semibold tracking-[-0.01em] transition-[box-shadow,filter,background-color,border-color,color] duration-300 motion-safe:active:scale-[0.98] sm:min-h-[48px] sm:px-7 md:min-h-[50px] md:px-8 md:text-[14px] ${styles[variant]} ${className}`}
      {...props}
    >
      <span className={btnPrimaryVertical.shine} aria-hidden />
      <span className="relative z-[1]">{children}</span>
    </Link>
  )
}
