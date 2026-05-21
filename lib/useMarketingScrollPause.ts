"use client"

import { useEffect } from "react"

/**
 * Pauses non-essential CSS animations while the user scrolls on touch / narrow viewports.
 * Toggles `marketing-scroll-active` on <html>.
 */
export function useMarketingScrollPause() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const shouldPause = () =>
      window.matchMedia("(max-width: 767px), (pointer: coarse)").matches

    if (!shouldPause()) return

    const root = document.documentElement
    let idleTimer: ReturnType<typeof setTimeout> | undefined

    const onScroll = () => {
      if (!shouldPause()) return
      root.classList.add("marketing-scroll-active")
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        root.classList.remove("marketing-scroll-active")
      }, 200)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("scroll", onScroll, { passive: true, capture: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("scroll", onScroll, { capture: true })
      clearTimeout(idleTimer)
      root.classList.remove("marketing-scroll-active")
    }
  }, [])
}
