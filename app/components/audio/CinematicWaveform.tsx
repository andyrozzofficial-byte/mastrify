"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useReducedMotion } from "framer-motion"
import WaveformCanvas from "./WaveformCanvas"
import { useWaveformData } from "./useWaveformData"

const PREVIEW_START = 60
const PREVIEW_DURATION = 30
const MOBILE_MASTERED_DURATION = 30

export type CinematicWaveformProps = {
  mode: "processing" | "result"
  /** Primary audio (original / upload) */
  audioSrc?: string | File | null
  /** Secondary for A/B morph on result */
  secondaryAudioSrc?: string | File | null
  /** 0 = primary only, 1 = secondary only */
  blend?: number
  activeStep?: number
  progress?: number
  isPlaying?: boolean
  variant?: "original" | "mastered"
  windowStartSec?: number
  windowDurationSec?: number
  isMobileMastered?: boolean
  interactive?: boolean
  onSeek?: (progress: number) => void
  height?: number
  className?: string
}

export default function CinematicWaveform({
  mode,
  audioSrc = null,
  secondaryAudioSrc = null,
  blend = 0,
  activeStep = 0,
  progress = 0,
  isPlaying = false,
  variant = "mastered",
  windowStartSec,
  windowDurationSec,
  isMobileMastered = false,
  interactive = false,
  onSeek,
  height = mode === "processing" ? 72 : 88,
  className = "",
}: CinematicWaveformProps) {
  const reduceMotion = useReducedMotion()
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const scanRef = useRef(0)
  const [scanProgress, setScanProgress] = useState(0)

  const window = useMemo(() => {
    if (mode === "processing") {
      return { startSec: 0, durationSec: 90 }
    }
    const start =
      windowStartSec ??
      (isMobileMastered && variant === "mastered" ? 0 : PREVIEW_START)
    const duration =
      windowDurationSec ??
      (isMobileMastered && variant === "mastered" ? MOBILE_MASTERED_DURATION : PREVIEW_DURATION)
    return { startSec: start, durationSec: duration }
  }, [mode, windowStartSec, windowDurationSec, isMobileMastered, variant])

  const primary = useWaveformData(audioSrc ?? null, {
    window: mode === "result" ? window : { startSec: 0, durationSec: 90 },
    enabled: Boolean(audioSrc),
  })

  const secondary = useWaveformData(secondaryAudioSrc ?? null, {
    window,
    enabled: Boolean(secondaryAudioSrc) && mode === "result",
    densify: true,
  })

  useEffect(() => {
    if (mode !== "processing" || reduceMotion) return
    let raf = 0
    const tick = () => {
      scanRef.current += 0.0022 + activeStep * 0.00035
      if (scanRef.current > 1) scanRef.current = 0
      setScanProgress(scanRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, activeStep, reduceMotion])

  const displayProgress =
    mode === "processing"
      ? reduceMotion
        ? 0.35
        : scanProgress
      : Math.max(0, Math.min(1, progress))

  const resolvePointerProgress = useCallback(
    (clientX: number, rect: DOMRect) => {
      const x = clientX - rect.left
      return Math.max(0, Math.min(1, x / Math.max(1, rect.width)))
    },
    []
  )

  const handlePointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive || mode !== "result") return
      const rect = e.currentTarget.getBoundingClientRect()
      const p = resolvePointerProgress(e.clientX, rect)
      if (e.type === "pointerdown") {
        onSeek?.(p)
        setHoverProgress(null)
        return
      }
      if (e.type === "pointermove" && (e.buttons === 1 || e.pointerType === "touch")) {
        onSeek?.(p)
        return
      }
      setHoverProgress(p)
    },
    [interactive, mode, onSeek, resolvePointerProgress]
  )

  const handleLeave = useCallback(() => setHoverProgress(null), [])

  const loading = primary.loading || (mode === "result" && secondary.loading)
  const hasPeaks = Boolean(primary.peaks)

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gradient-to-b from-white/[0.035] to-black/[0.28] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-12px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06] ${className}`}
      onPointerMove={interactive ? handlePointer : undefined}
      onPointerDown={interactive ? handlePointer : undefined}
      onPointerLeave={interactive ? handleLeave : undefined}
      role={interactive ? "slider" : undefined}
      aria-label={interactive ? "Waveform scrubber" : undefined}
      aria-valuenow={interactive ? Math.round(displayProgress * 100) : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_65%_at_50%_42%,rgba(99,102,241,0.11),transparent_62%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_88%,rgba(56,189,248,0.05),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent"
        aria-hidden
      />
      <WaveformCanvas
        peaks={primary.peaks}
        altPeaks={mode === "result" ? secondary.peaks : null}
        blend={blend}
        progress={displayProgress}
        hoverProgress={hoverProgress}
        isPlaying={mode === "processing" ? true : isPlaying}
        mode={mode}
        activeStep={activeStep}
        variant={variant}
        reducedMotion={Boolean(reduceMotion)}
        height={height}
        className="relative z-[1] w-full px-2 py-2 sm:px-3 sm:py-2.5"
      />
      {loading && !hasPeaks ? (
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
          aria-hidden
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
            Reading audio…
          </span>
        </div>
      ) : null}
    </div>
  )
}
