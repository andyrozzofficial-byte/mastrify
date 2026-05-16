"use client"

import Link from "next/link"
import type { ComponentProps } from "react"

type Variant = "primary" | "secondary"

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_36px_rgba(0,0,0,0.38),0_0_24px_rgba(99,102,241,0.12)] ring-1 ring-white/[0.1] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_44px_rgba(0,0,0,0.42),0_0_32px_rgba(99,102,241,0.18)] hover:brightness-[1.04]",
  secondary:
    "border border-white/[0.1] bg-white/[0.035] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.32)]",
}

type Props = ComponentProps<typeof Link> & {
  variant?: Variant
}

export default function PremiumButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <Link
      className={`group relative inline-flex min-h-[48px] w-auto max-w-full shrink-0 items-center justify-center overflow-hidden rounded-xl px-7 text-[13px] font-semibold tracking-[-0.01em] transition-all duration-300 active:scale-[0.98] sm:min-h-[48px] sm:px-7 md:min-h-[50px] md:px-8 md:text-[14px] ${styles[variant]} ${className}`}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
        aria-hidden
      />
      <span className="relative z-[1]">{children}</span>
    </Link>
  )
}
