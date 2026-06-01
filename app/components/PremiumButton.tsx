"use client"

import Link from "next/link"
import type { ComponentProps, MouseEvent } from "react"
import { useBetaMasteringGateOptional } from "./beta/BetaMasteringGateProvider"

type Variant = "primary" | "secondary"

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-violet-600/90 via-indigo-800/93 to-indigo-950/96 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.22),0_12px_32px_rgba(0,0,0,0.42),0_0_14px_rgba(67,56,120,0.065)] ring-1 ring-violet-950/35 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.18),0_14px_38px_rgba(0,0,0,0.46),0_0_18px_rgba(67,56,120,0.095)] hover:brightness-[1.02]",
  secondary:
    "border border-white/[0.1] bg-white/[0.035] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.32)]",
}

type Props = ComponentProps<typeof Link> & {
  variant?: Variant
  /** When true, blocks navigation and shows the beta gate unless the user has mastering access. */
  gateMastering?: boolean
}

export default function PremiumButton({
  variant = "primary",
  className = "",
  children,
  gateMastering = false,
  onClick,
  ...props
}: Props) {
  const gate = useBetaMasteringGateOptional()
  const hasAccess = gate?.hasAccess ?? false
  const checking = gate?.checking ?? false

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (!gateMastering || e.defaultPrevented || checking || hasAccess) return
    e.preventDefault()
    if (gate?.openGate) gate.openGate()
    else if (typeof props.href === "string") {
      window.location.assign(props.href)
    }
  }

  return (
    <Link
      className={`group relative inline-flex min-h-[48px] max-w-full min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-xl px-6 text-center text-[13px] font-semibold tracking-[-0.01em] transition-all duration-300 active:scale-[0.98] sm:min-h-[48px] sm:px-7 md:min-h-[50px] md:px-8 md:text-[14px] ${styles[variant]} ${className}`}
      onClick={gateMastering ? handleClick : onClick}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
        aria-hidden
      />
      <span className="relative z-[1]">{children}</span>
    </Link>
  )
}
