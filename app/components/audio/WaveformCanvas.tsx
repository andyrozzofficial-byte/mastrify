"use client"

import { useEffect, useRef } from "react"
import {
  getStageVisualState,
  lerpPeaks,
  type StageVisualState,
  type WaveformPeakSet,
} from "./waveform.utils"

export type WaveformCanvasRenderProps = {
  peaks: WaveformPeakSet | null
  altPeaks?: WaveformPeakSet | null
  blend?: number
  progress: number
  hoverProgress: number | null
  isPlaying: boolean
  mode: "processing" | "result"
  activeStep?: number
  variant?: "original" | "mastered"
  reducedMotion: boolean
  className?: string
  height?: number
}

type AnimState = {
  phase: number
  shimmer: number
  breathe: number
  blend: number
  scaleX: number
  scaleY: number
  energy: number
}

const COLORS = {
  glow: "rgba(139,92,246,0.35)",
  playhead: "rgba(245,243,255,0.92)",
}

function drawWavePath(
  ctx: CanvasRenderingContext2D,
  peaks: Float32Array,
  stereo: Float32Array,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  stereoBoost: number
) {
  const mid = height / 2
  const maxH = (height * 0.42) * scaleY
  const n = peaks.length
  const step = width / (n - 1)
  const offsetX = (width - width * scaleX) / 2

  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const spread = 1 + stereo[i] * stereoBoost * 0.12
    const amp = peaks[i] * maxH * spread
    const x = offsetX + i * step * scaleX
    const y = mid - amp
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let i = n - 1; i >= 0; i--) {
    const spread = 1 + stereo[i] * stereoBoost * 0.12
    const amp = peaks[i] * maxH * spread
    const x = offsetX + i * step * scaleX
    const y = mid + amp
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function fillGradient(ctx: CanvasRenderingContext2D, width: number, height: number, alpha = 1) {
  const g = ctx.createLinearGradient(0, height * 0.2, width, height * 0.8)
  g.addColorStop(0, `rgba(196,181,253,${0.55 * alpha})`)
  g.addColorStop(0.45, `rgba(165,180,252,${0.72 * alpha})`)
  g.addColorStop(1, `rgba(125,211,252,${0.5 * alpha})`)
  return g
}

export default function WaveformCanvas({
  peaks,
  altPeaks,
  blend = 0,
  progress,
  hoverProgress,
  isPlaying,
  mode,
  activeStep = 0,
  variant = "mastered",
  reducedMotion,
  className,
  height = 88,
}: WaveformCanvasRenderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const propsRef = useRef({ peaks, altPeaks, blend, progress, hoverProgress, isPlaying, mode, activeStep, variant, reducedMotion })
  const animRef = useRef<AnimState>({
    phase: 0,
    shimmer: 0.5,
    breathe: 0,
    blend: 0,
    scaleX: 1,
    scaleY: 1,
    energy: 0,
  })
  const blendPeaksRef = useRef<Float32Array | null>(null)
  const rafRef = useRef<number | null>(null)

  propsRef.current = { peaks, altPeaks, blend, progress, hoverProgress, isPlaying, mode, activeStep, variant, reducedMotion }

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)

    const resize = () => {
      const w = container.clientWidth
      const h = height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    ro?.observe(container)

    const stageTarget = (): StageVisualState =>
      propsRef.current.mode === "processing"
        ? getStageVisualState(propsRef.current.activeStep ?? 0)
        : { scaleX: 1, scaleY: 1, shimmer: propsRef.current.isPlaying ? 0.55 : 0.25, stability: 1, breathe: 0.5 }

    const draw = (time: number) => {
      const p = propsRef.current
      const w = container.clientWidth
      const h = height
      if (w <= 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const anim = animRef.current
      const target = stageTarget()
      const dt = reducedMotion ? 0 : 0.016

      if (!reducedMotion) {
        anim.phase += dt * (p.isPlaying ? 1.1 : 0.55)
        anim.shimmer += (target.shimmer - anim.shimmer) * 0.04
        anim.breathe += dt * (p.isPlaying ? 1.4 : 0.7)
        anim.blend += (p.blend - anim.blend) * 0.08
        anim.scaleX += (target.scaleX - anim.scaleX) * 0.06
        anim.scaleY += (target.scaleY - anim.scaleY) * 0.06
      } else {
        anim.shimmer = target.shimmer
        anim.blend = p.blend
        anim.scaleX = target.scaleX
        anim.scaleY = target.scaleY
      }

      ctx.clearRect(0, 0, w, h)

      const base = p.peaks
      if (!base) {
        ctx.fillStyle = "rgba(255,255,255,0.04)"
        ctx.fillRect(0, h * 0.45, w, 2)
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      let bars = base.bars
      let stereo = base.stereoSpread
      if (p.altPeaks && anim.blend > 0.001) {
        if (!blendPeaksRef.current || blendPeaksRef.current.length !== base.bars.length) {
          blendPeaksRef.current = new Float32Array(base.bars.length)
        }
        bars = lerpPeaks(base.bars, p.altPeaks.bars, anim.blend, blendPeaksRef.current)
        stereo = p.altPeaks.stereoSpread
      }

      const stereoBoost = p.mode === "processing" && (p.activeStep ?? 0) === 3 ? 1.35 : p.variant === "mastered" ? 0.85 : 0.55
      const breatheMod = reducedMotion ? 1 : 1 + Math.sin(anim.breathe) * 0.04 * target.breathe

      ctx.save()
      ctx.filter = "blur(14px)"
      ctx.globalAlpha = 0.35 + anim.shimmer * 0.12
      drawWavePath(ctx, bars, stereo, w, h, anim.scaleX, anim.scaleY * breatheMod, stereoBoost)
      ctx.fillStyle = COLORS.glow
      ctx.fill()
      ctx.restore()

      const playT = Math.max(0, Math.min(1, p.progress))
      const hoverT = p.hoverProgress != null ? Math.max(0, Math.min(1, p.hoverProgress)) : null
      const splitX = playT * w

      ctx.save()
      drawWavePath(ctx, bars, stereo, w, h, anim.scaleX, anim.scaleY * breatheMod, stereoBoost)
      ctx.clip()
      ctx.fillStyle = fillGradient(ctx, w, h, 0.85)
      ctx.fill()
      ctx.restore()

      if (splitX > 0.5) {
        ctx.save()
        drawWavePath(ctx, bars, stereo, w, h, anim.scaleX, anim.scaleY * breatheMod, stereoBoost)
        ctx.beginPath()
        ctx.rect(0, 0, splitX, h)
        ctx.clip()
        ctx.fillStyle = fillGradient(ctx, w, h, 1)
        ctx.fill()
        ctx.restore()
      }

      drawWavePath(ctx, bars, stereo, w, h, anim.scaleX, anim.scaleY * breatheMod, stereoBoost)
      ctx.strokeStyle = "rgba(255,255,255,0.08)"
      ctx.lineWidth = 1
      ctx.stroke()

      if (p.isPlaying && !reducedMotion) {
        const shimmerX = ((Math.sin(anim.phase * 0.9) * 0.5 + 0.5) * 0.85 + 0.05) * w
        const g = ctx.createLinearGradient(shimmerX - 60, 0, shimmerX + 60, 0)
        g.addColorStop(0, "rgba(255,255,255,0)")
        g.addColorStop(0.5, `rgba(196,181,253,${0.12 * anim.shimmer})`)
        g.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }

      const peakIdx = Math.floor(playT * (bars.length - 1))
      if (bars[peakIdx] > 0.72 && p.isPlaying && !reducedMotion) {
        const sparkX = (peakIdx / (bars.length - 1)) * w
        ctx.beginPath()
        ctx.arc(sparkX, h * 0.5 - bars[peakIdx] * h * 0.2, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255,255,255,0.45)"
        ctx.fill()
      }

      const headX = playT * w
      const pulse = reducedMotion ? 1 : 1 + Math.sin(anim.phase * 3.2) * 0.15 * (p.isPlaying ? 1 : 0.35)
      ctx.save()
      ctx.strokeStyle = COLORS.playhead
      ctx.lineWidth = 1.5 * pulse
      ctx.shadowColor = "rgba(167,139,250,0.55)"
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(headX, h * 0.12)
      ctx.lineTo(headX, h * 0.88)
      ctx.stroke()
      ctx.restore()

      if (hoverT != null && Math.abs(hoverT - playT) > 0.01) {
        const hx = hoverT * w
        ctx.save()
        ctx.strokeStyle = "rgba(255,255,255,0.22)"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 4])
        ctx.beginPath()
        ctx.moveTo(hx, h * 0.15)
        ctx.lineTo(hx, h * 0.85)
        ctx.stroke()
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      ro?.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [height, reducedMotion])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="block w-full" aria-hidden />
    </div>
  )
}
