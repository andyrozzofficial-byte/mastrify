"use client"

import { useEffect, useState, type RefObject } from "react"

type Options = {
  rootMargin?: string
  threshold?: number | number[]
  /** When false, do nothing and return true. */
  enabled?: boolean
}

/**
 * Lightweight viewport gate for pausing expensive animation loops.
 * Defaults to "in viewport" during SSR / unsupported environments.
 */
export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = "200px", threshold = 0, enabled = true }: Options = {},
): boolean {
  const [inView, setInView] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setInView(true)
      return
    }
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        setInView(entry.isIntersecting)
      },
      { root: null, rootMargin, threshold },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, rootMargin, threshold, enabled])

  return inView
}

