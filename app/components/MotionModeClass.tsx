"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

function isWorkflowRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return (
    pathname === "/analyze" ||
    pathname.startsWith("/analyze/") ||
    pathname === "/master" ||
    pathname.startsWith("/master/") ||
    pathname === "/flow" ||
    pathname.startsWith("/flow/") ||
    pathname === "/flow-v2" ||
    pathname.startsWith("/flow-v2/")
  )
}

/**
 * Sets motion mode classes on <html>:
 * - `motion-workflow`: analyze/master flows (keep motion)
 * - `motion-passive`: marketing/content pages (no idle loops)
 */
export default function MotionModeClass() {
  const pathname = usePathname()

  useEffect(() => {
    const root = document.documentElement
    const workflow = isWorkflowRoute(pathname)
    root.classList.toggle("motion-workflow", workflow)
    root.classList.toggle("motion-passive", !workflow)
    return () => {
      root.classList.remove("motion-workflow")
      root.classList.remove("motion-passive")
    }
  }, [pathname])

  return null
}

