"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import SiteFooter from "./SiteFooter"
import SiteHeader from "./SiteHeader"

const MINIMAL_ROUTES = ["/access"] as const

function isMinimalRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return MINIMAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const minimal = isMinimalRoute(pathname)

  if (minimal) {
    return <main className="site-overflow-guard flex min-h-[100dvh] flex-1 flex-col">{children}</main>
  }

  return (
    <>
      <SiteHeader />
      <main className="site-overflow-guard flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  )
}
