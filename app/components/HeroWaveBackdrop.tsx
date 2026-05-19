"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

const HERO_WAVE_BAR_COUNT = 72
const HERO_WAVE_BAR_COUNT_LITE = 40

const HERO_WAVE_BAR_HEIGHTS: readonly number[] = Array.from({ length: HERO_WAVE_BAR_COUNT }, (_, i) => {
  const t = Math.sin(i * 0.35) * 0.5 + 0.5
  return Math.round((22 + t * 58) * 100) / 100
})

const HERO_WAVE_BAR_HEIGHTS_LITE: readonly number[] = HERO_WAVE_BAR_HEIGHTS.filter(
  (_, i) => i % 2 === 0
).slice(0, HERO_WAVE_BAR_COUNT_LITE)

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}

type Props = {
  className?: string
  heightClass?: string
  /** Marketing: static bars, no per-frame rAF */
  efficient?: boolean
}

export default function HeroWaveBackdrop({
  className = "",
  heightClass = "h-[42%]",
  efficient = false,
}: Props) {
  const reduce = useReducedMotion()
  const mounted = useMounted()
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])
  const heights = efficient ? HERO_WAVE_BAR_HEIGHTS_LITE : HERO_WAVE_BAR_HEIGHTS

  useEffect(() => {
    if (efficient || !mounted || reduce) return

    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const phase = (now - start) / 1000
      for (let i = 0; i < HERO_WAVE_BAR_HEIGHTS.length; i++) {
        const el = barRefs.current[i]
        if (!el) continue
        const wobble = 1 + Math.sin(phase * 2.15 + i * 0.17) * (0.05 + (i % 5) * 0.004)
        const shimmer = 0.34 + (Math.sin(phase * 1.35 + i * 0.11) * 0.5 + 0.5) * 0.28
        el.style.transform = `scaleY(${wobble})`
        el.style.opacity = String(shimmer)
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [efficient, mounted, reduce])

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden opacity-[0.14] ${heightClass} ${className} ${
        efficient ? "marketing-wave-backdrop" : ""
      }`}
      aria-hidden
    >
      <div className="flex h-full items-end justify-center gap-[3px] px-6">
        {heights.map((heightPct, i) => (
          <span
            key={i}
            ref={
              efficient
                ? undefined
                : (el) => {
                    barRefs.current[i] = el
                  }
            }
            className="w-[2px] origin-bottom rounded-full bg-gradient-to-t from-violet-500/40 via-indigo-300/35 to-cyan-300/25"
            style={{
              height: `${heightPct}%`,
              opacity: efficient ? 0.4 : 0.42,
              transform: "scaleY(1)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
