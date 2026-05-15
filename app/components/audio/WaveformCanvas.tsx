"use client"

import { useEffect, useRef } from "react"
import {
  getStageVisualState,
  getVariantVisual,
  lerpPeaks,
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
  polish: number
  fieldWidth: number
  energy: number
  playT: number
  hoverT: number
  liftY: number
}

type Spark = { x: number; y: number; life: number; size: number }

const LERP_PEAKS = 0.13
const LERP_PLAY = 0.16
const LERP_HOVER = 0.22

function drawWavePath(
  ctx: CanvasRenderingContext2D,
  peaks: Float32Array,
  stereo: Float32Array,
  width: number,
  height: number,
  midY: number,
  scaleX: number,
  scaleY: number,
  stereoBoost: number,
  ampScale: number
) {
  const maxH = height * 0.42 * scaleY * ampScale
  const n = peaks.length
  const step = width / (n - 1)
  const offsetX = (width - width * scaleX) / 2

  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const spread = 1 + stereo[i] * stereoBoost * 0.14
    const amp = peaks[i] * maxH * spread
    const x = offsetX + i * step * scaleX
    const y = midY - amp
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let i = n - 1; i >= 0; i--) {
    const spread = 1 + stereo[i] * stereoBoost * 0.14
    const amp = peaks[i] * maxH * spread
    const x = offsetX + i * step * scaleX
    const y = midY + amp
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function fillGradient(ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number, cool: boolean) {
  const g = ctx.createLinearGradient(0, height * 0.15, width, height * 0.85)
  if (cool) {
    g.addColorStop(0, `rgba(196,181,253,${0.5 * alpha})`)
    g.addColorStop(0.45, `rgba(165,180,252,${0.78 * alpha})`)
    g.addColorStop(1, `rgba(125,211,252,${0.55 * alpha})`)
  } else {
    g.addColorStop(0, `rgba(196,181,253,${0.38 * alpha})`)
    g.addColorStop(0.5, `rgba(148,163,184,${0.42 * alpha})`)
    g.addColorStop(1, `rgba(148,163,184,${0.28 * alpha})`)
  }
  return g
}

function applyLivePeaks(
  out: Float32Array,
  source: Float32Array,
  phase: number,
  playT: number,
  isPlaying: boolean,
  energy: number,
  stability: number
) {
  const motion = isPlaying ? 1 : 0.35
  const damp = 0.012 * motion * (1 - stability * 0.65)
  for (let i = 0; i < source.length; i++) {
    const t = i / source.length
    const nearPlay = Math.max(0, 1 - Math.abs(t - playT) * 5)
    const micro = Math.sin(phase * 2.4 + i * 0.17) * damp * (1 + energy * 0.8)
    const ripple = Math.sin(phase * 0.85 + t * 6.5) * damp * 0.65
    const reactive = nearPlay * energy * 0.035 * motion
    out[i] = Math.max(0, Math.min(1, source[i] * (1 + micro + ripple + reactive)))
  }
}

function drawDepthLayers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  glowMul: number,
  polish: number,
  isPlaying: boolean
) {
  const cx = w * 0.5
  const cy = h * 0.52

  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.55)
  bloom.addColorStop(0, `rgba(99,102,241,${0.1 * glowMul})`)
  bloom.addColorStop(0.45, `rgba(79,70,229,${0.05 * glowMul})`)
  bloom.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, w, h)

  const inner = ctx.createRadialGradient(cx, cy, w * 0.08, cx, cy, w * 0.42)
  inner.addColorStop(0, `rgba(167,139,250,${0.06 * glowMul * (isPlaying ? 1.15 : 1)})`)
  inner.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = inner
  ctx.fillRect(0, 0, w, h)

  const vignette = ctx.createLinearGradient(0, 0, 0, h)
  vignette.addColorStop(0, `rgba(0,0,0,${0.22 + polish * 0.06})`)
  vignette.addColorStop(0.35, "rgba(0,0,0,0)")
  vignette.addColorStop(0.72, "rgba(0,0,0,0)")
  vignette.addColorStop(1, `rgba(0,0,0,${0.35 + polish * 0.08})`)
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = "rgba(0,0,0,0.18)"
  ctx.fillRect(0, h * 0.78, w, h * 0.22)
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
  const propsRef = useRef({
    peaks,
    altPeaks,
    blend,
    progress,
    hoverProgress,
    isPlaying,
    mode,
    activeStep,
    variant,
    reducedMotion,
  })
  const animRef = useRef<AnimState>({
    phase: 0,
    shimmer: 0.5,
    breathe: 0,
    blend: 0,
    scaleX: 1,
    scaleY: 1,
    polish: 0,
    fieldWidth: 1,
    energy: 0,
    playT: 0,
    hoverT: 0,
    liftY: 0,
  })
  const blendPeaksRef = useRef<Float32Array | null>(null)
  const smoothPeaksRef = useRef<Float32Array | null>(null)
  const livePeaksRef = useRef<Float32Array | null>(null)
  const sparksRef = useRef<Spark[]>([])
  const lastSparkIdxRef = useRef(-1)
  const stereoBlendRef = useRef<Float32Array | null>(null)
  const rafRef = useRef<number | null>(null)

  propsRef.current = {
    peaks,
    altPeaks,
    blend,
    progress,
    hoverProgress,
    isPlaying,
    mode,
    activeStep,
    variant,
    reducedMotion,
  }

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

    const draw = () => {
      const p = propsRef.current
      const w = container.clientWidth
      const h = height
      if (w <= 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const anim = animRef.current
      const reduced = p.reducedMotion
      const dt = reduced ? 0 : 0.016

      const stage =
        p.mode === "processing"
          ? getStageVisualState(p.activeStep ?? 0)
          : {
              scaleX: 1,
              scaleY: 1,
              shimmer: p.isPlaying ? 0.58 : 0.22,
              stability: 0.85,
              breathe: p.isPlaying ? 0.62 : 0.35,
              polish: p.variant === "mastered" ? 0.85 : 0.35,
              fieldWidth: 1,
            }

      const variantVis = getVariantVisual(
        p.mode === "result" ? anim.blend : 0.22 + anim.polish * 0.15
      )

      if (!reduced) {
        anim.phase += dt * (p.isPlaying ? 1.25 : 0.5)
        anim.shimmer += (stage.shimmer - anim.shimmer) * 0.045
        anim.breathe += dt * (p.isPlaying ? 1.5 : 0.65)
        anim.blend += (p.blend - anim.blend) * 0.07
        anim.scaleX += (stage.scaleX * stage.fieldWidth - anim.scaleX) * 0.055
        anim.scaleY += (stage.scaleY - anim.scaleY) * 0.055
        anim.polish += (stage.polish - anim.polish) * 0.05
        anim.fieldWidth += (stage.fieldWidth - anim.fieldWidth) * 0.05

        const targetPlay = Math.max(0, Math.min(1, p.progress))
        const playLerp = p.isPlaying ? LERP_PLAY : 0.28
        anim.playT += (targetPlay - anim.playT) * playLerp

        const targetHover = p.hoverProgress ?? anim.playT
        anim.hoverT += (targetHover - anim.hoverT) * (p.hoverProgress != null ? LERP_HOVER : 0.12)
      } else {
        anim.shimmer = stage.shimmer
        anim.blend = p.blend
        anim.scaleX = stage.scaleX * stage.fieldWidth
        anim.scaleY = stage.scaleY
        anim.polish = stage.polish
        anim.playT = p.progress
        anim.hoverT = p.hoverProgress ?? p.progress
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
        if (!stereoBlendRef.current || stereoBlendRef.current.length !== base.stereoSpread.length) {
          stereoBlendRef.current = new Float32Array(base.stereoSpread.length)
        }
        stereo = lerpPeaks(base.stereoSpread, p.altPeaks.stereoSpread, anim.blend, stereoBlendRef.current)
      }

      if (!smoothPeaksRef.current || smoothPeaksRef.current.length !== bars.length) {
        smoothPeaksRef.current = new Float32Array(bars.length)
        smoothPeaksRef.current.set(bars)
      } else {
        for (let i = 0; i < bars.length; i++) {
          smoothPeaksRef.current[i] += (bars[i] - smoothPeaksRef.current[i]) * LERP_PEAKS
        }
      }

      if (!livePeaksRef.current || livePeaksRef.current.length !== bars.length) {
        livePeaksRef.current = new Float32Array(bars.length)
      }

      const playIdx = Math.floor(anim.playT * (bars.length - 1))
      const localEnergy = smoothPeaksRef.current[playIdx] ?? 0
      anim.energy += (localEnergy - anim.energy) * 0.14

      applyLivePeaks(
        livePeaksRef.current,
        smoothPeaksRef.current,
        anim.phase,
        anim.playT,
        p.isPlaying,
        anim.energy,
        stage.stability
      )

      const stereoBoost =
        (p.mode === "processing" && (p.activeStep ?? 0) === 3 ? 1.28 : 1) *
        variantVis.stereoMul *
        anim.fieldWidth
      const breatheMod = reduced ? 1 : 1 + Math.sin(anim.breathe) * 0.035 * stage.breathe
      const liftTarget = p.isPlaying ? -anim.energy * 2.2 * (1 - stage.stability * 0.5) : 0
      anim.liftY += (liftTarget - anim.liftY) * 0.1
      const midY = h / 2 + anim.liftY

      drawDepthLayers(ctx, w, h, variantVis.glowMul, anim.polish, p.isPlaying)

      const drawGlowLayer = (blur: number, alpha: number) => {
        ctx.save()
        ctx.filter = `blur(${blur}px)`
        ctx.globalAlpha = alpha * variantVis.glowMul
        drawWavePath(
          ctx,
          livePeaksRef.current!,
          stereo,
          w,
          h,
          midY,
          anim.scaleX,
          anim.scaleY * breatheMod,
          stereoBoost,
          variantVis.ampScale
        )
        ctx.fillStyle = "rgba(139,92,246,0.4)"
        ctx.fill()
        ctx.restore()
      }

      drawGlowLayer(22, 0.22 + anim.shimmer * 0.08)
      drawGlowLayer(10, 0.28 + anim.shimmer * 0.1)

      const playT = anim.playT
      const hoverT = p.hoverProgress != null ? anim.hoverT : null
      const splitX = playT * w
      const isMasteredTone = variantVis.glowMul > 0.52

      ctx.save()
      ctx.globalAlpha = variantVis.opacity
      drawWavePath(
        ctx,
        livePeaksRef.current!,
        stereo,
        w,
        h,
        midY,
        anim.scaleX,
        anim.scaleY * breatheMod,
        stereoBoost,
        variantVis.ampScale
      )
      ctx.clip()
      ctx.fillStyle = fillGradient(ctx, w, h, 0.82, isMasteredTone)
      ctx.fill()
      ctx.restore()

      if (splitX > 0.5) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, variantVis.opacity + 0.12)
        drawWavePath(
          ctx,
          livePeaksRef.current!,
          stereo,
          w,
          h,
          midY,
          anim.scaleX,
          anim.scaleY * breatheMod,
          stereoBoost,
          variantVis.ampScale
        )
        ctx.beginPath()
        ctx.rect(0, 0, splitX, h)
        ctx.clip()
        ctx.fillStyle = fillGradient(ctx, w, h, 1, true)
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.globalAlpha = variantVis.opacity * 0.9
      drawWavePath(
        ctx,
        livePeaksRef.current!,
        stereo,
        w,
        h,
        midY,
        anim.scaleX,
        anim.scaleY * breatheMod,
        stereoBoost,
        variantVis.ampScale
      )
      ctx.strokeStyle = `rgba(255,255,255,${0.06 * variantVis.strokeMul})`
      ctx.lineWidth = variantVis.strokeMul
      ctx.stroke()
      ctx.restore()

      if (p.isPlaying && !reduced) {
        const shimmerX = ((Math.sin(anim.phase * 0.85) * 0.5 + 0.5) * 0.82 + 0.06) * w
        const g = ctx.createLinearGradient(shimmerX - 72, 0, shimmerX + 72, 0)
        g.addColorStop(0, "rgba(255,255,255,0)")
        g.addColorStop(0.5, `rgba(196,181,253,${0.1 * anim.shimmer * variantVis.glowMul})`)
        g.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)

        const scanX = playT * w
        const scanG = ctx.createLinearGradient(scanX - 28, 0, scanX + 28, 0)
        scanG.addColorStop(0, "rgba(255,255,255,0)")
        scanG.addColorStop(0.5, `rgba(125,211,252,${0.06 * anim.shimmer})`)
        scanG.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = scanG
        ctx.fillRect(0, 0, w, h)
      }

      if (p.isPlaying && !reduced && localEnergy > 0.58 && playIdx !== lastSparkIdxRef.current) {
        if (Math.random() < 0.35 + localEnergy * 0.4) {
          const sx = (playIdx / (bars.length - 1)) * w
          const sy = midY - livePeaksRef.current![playIdx] * h * 0.18
          sparksRef.current.push({ x: sx, y: sy, life: 1, size: 1.5 + localEnergy * 2 })
          lastSparkIdxRef.current = playIdx
        }
      }

      sparksRef.current = sparksRef.current.filter((s) => {
        s.life -= 0.045
        if (s.life <= 0) return false
        const a = s.life * s.life * 0.35 * variantVis.glowMul
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * (2 - s.life), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
        return true
      })

      const headX = playT * w
      const pulse = reduced ? 1 : 1 + Math.sin(anim.phase * 3.4) * 0.12 * (p.isPlaying ? 1 : 0.3)

      ctx.save()
      const halo = ctx.createRadialGradient(headX, midY, 0, headX, midY, 22 * pulse)
      halo.addColorStop(0, `rgba(255,255,255,${0.14 * variantVis.glowMul})`)
      halo.addColorStop(0.5, `rgba(167,139,250,${0.08 * variantVis.glowMul})`)
      halo.addColorStop(1, "rgba(167,139,250,0)")
      ctx.fillStyle = halo
      ctx.fillRect(headX - 28, midY - 28, 56, 56)
      ctx.restore()

      ctx.save()
      ctx.strokeStyle = `rgba(245,243,255,${0.75 + variantVis.glowMul * 0.2})`
      ctx.lineWidth = 1.35 * pulse
      ctx.shadowColor = `rgba(167,139,250,${0.45 * variantVis.glowMul})`
      ctx.shadowBlur = 10 * pulse
      ctx.beginPath()
      ctx.moveTo(headX, h * 0.1)
      ctx.lineTo(headX, h * 0.9)
      ctx.stroke()
      ctx.restore()

      if (hoverT != null && Math.abs(hoverT - playT) > 0.008) {
        const hx = hoverT * w
        const x0 = Math.min(hx, headX)
        const x1 = Math.max(hx, headX)
        ctx.save()
        ctx.fillStyle = `rgba(167,139,250,${0.04 * variantVis.glowMul})`
        ctx.fillRect(x0, h * 0.12, x1 - x0, h * 0.76)
        ctx.restore()

        ctx.save()
        ctx.strokeStyle = `rgba(255,255,255,${0.18 + variantVis.glowMul * 0.12})`
        ctx.lineWidth = 1
        ctx.shadowColor = "rgba(167,139,250,0.25)"
        ctx.shadowBlur = 6
        ctx.setLineDash([2, 5])
        ctx.beginPath()
        ctx.moveTo(hx, h * 0.14)
        ctx.lineTo(hx, h * 0.86)
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
    <div ref={containerRef} className={className} style={{ height }}>
      <canvas ref={canvasRef} className="block w-full" aria-hidden />
    </div>
  )
}
