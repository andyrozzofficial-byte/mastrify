"use client"

import type { ReactNode } from "react"
import SiteFooter from "./SiteFooter"
import SiteHeader from "./SiteHeader"

export default function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="site-overflow-guard flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  )
}
