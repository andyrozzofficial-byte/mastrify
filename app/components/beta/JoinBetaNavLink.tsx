"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { useBetaMasteringGateOptional } from "./BetaMasteringGateProvider"
import BetaMemberNavBadge from "./BetaMemberNavBadge"

const pillBase =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-violet-400/28 bg-violet-500/[0.14] font-semibold text-violet-100/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition duration-200 hover:border-violet-300/45 hover:bg-violet-500/22 hover:text-white hover:shadow-[0_0_16px_rgba(139,92,246,0.2)] active:scale-[0.98]"

type Props = {
  className?: string
  children?: ReactNode
  compact?: boolean
}

export default function JoinBetaNavLink({
  className = "",
  children = "Join Beta",
  compact = false,
}: Props) {
  const pathname = usePathname()
  const gate = useBetaMasteringGateOptional()
  const active = pathname === "/access" || pathname.startsWith("/access/")

  if (gate?.checking) {
    return (
      <span
        className={`${pillBase} pointer-events-none opacity-0 ${
          compact ? "min-h-[32px] min-w-[4.5rem] px-2.5" : "min-h-[34px] min-w-[5rem] px-3.5"
        } ${className}`}
        aria-hidden
      >
        {children}
      </span>
    )
  }

  if (gate?.isBeta) {
    return (
      <BetaMemberNavBadge
        label={gate.betaUi?.navLabel ?? "Beta Member"}
        compact={compact}
        className={className}
      />
    )
  }

  return (
    <Link
      href="/access"
      className={`${pillBase} ${
        compact
          ? "min-h-[32px] px-2.5 py-1 text-[10px] tracking-wide sm:px-3 sm:text-[11px]"
          : "min-h-[34px] px-3.5 py-1.5 text-[11px] tracking-wide sm:text-[12px]"
      } ${active ? "border-violet-300/50 bg-violet-500/25 text-white ring-1 ring-violet-400/20" : ""} ${className}`}
    >
      {children}
    </Link>
  )
}
