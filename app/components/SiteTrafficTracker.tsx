"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { trackPageView } from "../../lib/trackClient"

/** Records real pageviews for public site routes (excludes /admin). */
export default function SiteTrafficTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return
    const search = typeof window !== "undefined" ? window.location.search : ""
    trackPageView({ path: pathname, search })
  }, [pathname])

  return null
}
