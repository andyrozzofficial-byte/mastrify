"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import MotionModeClass from "./MotionModeClass"
import MarketingFinalCtaSection from "./MarketingFinalCtaSection"
import SiteFooter from "./SiteFooter"
import SiteHeader from "./SiteHeader"

const MINIMAL_ROUTES = ["/access", "/admin", "/login"] as const

function isMinimalRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return MINIMAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

type SiteChromeProps = {
  children: ReactNode
  showAdminNav?: boolean
}

export default function SiteChrome({ children, showAdminNav = false }: SiteChromeProps) {
  const pathname = usePathname()
  const minimal = isMinimalRoute(pathname)

  if (minimal) {
    return (
      <>
        <MotionModeClass />
        <main className="site-overflow-guard flex min-h-[100dvh] flex-1 flex-col">{children}</main>
      </>
    )
  }

  return (
    <>
      <MotionModeClass />
      <SiteHeader showAdminNav={showAdminNav} />
      <main className="site-overflow-guard flex flex-1 flex-col">{children}</main>
      <MarketingFinalCtaSection />
      <SiteFooter />
    </>
  )
}
