"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Renders children once near the viewport (defers chart/heavy subtree work).
 * No visual change once mounted — same components as before.
 */
export function AdminWhenVisible({
  children,
  rootMargin = "120px",
}: {
  children: ReactNode
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return <div ref={ref}>{visible ? children : null}</div>
}
