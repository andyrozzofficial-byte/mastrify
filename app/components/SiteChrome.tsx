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
    return <main className="flex min-h-[100dvh] w-full flex-1 flex-col">{children}</main>
  }

  return (
    <>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  )
}
