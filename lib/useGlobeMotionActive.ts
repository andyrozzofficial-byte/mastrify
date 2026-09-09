"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

/** True when viewport is md (768px) or wider — matches hero orb visibility breakpoint. */
export function useMinMd() {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const sync = () => setMatches(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return matches
}

/**
 * Pause globe motion when off-screen or tab hidden — same visuals when active,
 * no rAF / Framer repeat loops while inactive.
 */
export function useGlobeMotionActive(enabled = true) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)

  useEffect(() => {
    if (!enabled) return
    const onVisibility = () => setTabVisible(!document.hidden)
    onVisibility()
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting && entry.intersectionRatio > 0.04)
      },
      { threshold: [0, 0.04, 0.1] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled])

  const active = enabled && !reduce && inView && tabVisible
  return { ref, active }
}
