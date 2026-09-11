"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { btnMastrifySecondaryCore } from "./buttonEffects"

type Variant = "primary" | "secondary"

/** Every variant matches landing "Analyze your mix" — secondary is the reference token. */
const styles: Record<Variant, string> = {
  primary: btnMastrifySecondaryCore,
  secondary: btnMastrifySecondaryCore,
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
      className={`safari-nav-link stable-interaction inline-flex min-h-[48px] max-w-full min-w-0 shrink-0 items-center justify-center rounded-xl px-6 text-center text-[13px] font-semibold leading-none tracking-[-0.01em] sm:min-h-[48px] sm:px-7 md:min-h-[50px] md:px-8 md:text-[14px] ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  )
}
