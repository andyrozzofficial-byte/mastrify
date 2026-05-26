"use client"

import Link from "next/link"
import type { ComponentProps, MouseEvent, ReactNode } from "react"
import { useBetaMasteringGate } from "./BetaMasteringGateProvider"

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href?: string
  children: ReactNode
  /** When true, users without beta access see the gate instead of navigating to mastering. */
  gateMastering?: boolean
}

export default function GatedMasterNavLink({
  href = "/master",
  gateMastering = false,
  children,
  onClick,
  ...props
}: Props) {
  const { hasAccess, checking, openGate } = useBetaMasteringGate()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (!gateMastering || e.defaultPrevented || checking || hasAccess) return
    e.preventDefault()
    openGate()
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}
