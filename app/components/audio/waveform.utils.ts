export const DEFAULT_BAR_COUNT = 280

export type WaveformPeakSet = {
  bars: Float32Array
  stereoSpread: Float32Array
  duration: number
  barCount: number
  windowStart: number
  windowDuration: number
}

export type WaveformWindow = {
  startSec: number
  durationSec: number
}

export type StageVisualState = {
  scaleX: number
  scaleY: number
  shimmer: number
  stability: number
  breathe: number
  polish: number
  fieldWidth: number
}

export type VariantVisual = {
  ampScale: number
  opacity: number
  glowMul: number
  strokeMul: number
  stereoMul: number
}

const peakCache = new Map<string, WaveformPeakSet>()

function cacheKey(src: string, barCount: number, window: WaveformWindow) {
  return `${src}|${barCount}|${window.startSec}|${window.durationSec}`
}

/** Per-stage motion for processing screen — restrained, engine-like */
export function getStageVisualState(step: number): StageVisualState {
  const s = Math.min(4, Math.max(0, Math.floor(step)))
  switch (s) {
    case 0:
      return { scaleX: 1, scaleY: 1, shimmer: 1, stability: 0, breathe: 0.92, polish: 0, fieldWidth: 1 }
    case 1:
      return { scaleX: 1.02, scaleY: 0.97, shimmer: 0.78, stability: 0.15, breathe: 0.8, polish: 0.2, fieldWidth: 1.02 }
    case 2:
      return { scaleX: 0.98, scaleY: 0.86, shimmer: 0.52, stability: 0.35, breathe: 0.55, polish: 0.35, fieldWidth: 0.98 }
    case 3:
      return { scaleX: 1.14, scaleY: 0.96, shimmer: 0.68, stability: 0.25, breathe: 0.7, polish: 0.45, fieldWidth: 1.14 }
    case 4:
    default:
      return { scaleX: 1.02, scaleY: 1, shimmer: 0.24, stability: 1, breathe: 0.28, polish: 1, fieldWidth: 1.02 }
  }
}

/** blend 0 = original, 1 = mastered */
export function getVariantVisual(blend: number): VariantVisual {
  const k = Math.max(0, Math.min(1, blend))
  return {
    ampScale: 0.88 + k * 0.12,
    opacity: 0.68 + k * 0.32,
    glowMul: 0.42 + k * 0.58,
    strokeMul: 0.8 + k * 0.2,
    stereoMul: 0.62 + k * 0.38,
  }
}

export function lerpPeaks(a: Float32Array, b: Float32Array, t: number, out?: Float32Array): Float32Array {
  const n = Math.min(a.length, b.length)
  const result = out && out.length === n ? out : new Float32Array(n)
  const k = Math.max(0, Math.min(1, t))
  for (let i = 0; i < n; i++) {
    result[i] = a[i] + (b[i] - a[i]) * k
  }
  return result
}

export function densifyPeaks(peaks: Float32Array, amount = 1.06): Float32Array {
  const out = new Float32Array(peaks.length)
  for (let i = 0; i < peaks.length; i++) {
    out[i] = Math.min(1, peaks[i] * amount)
  }
  return out
}

export function normalizePeaks(peaks: Float32Array, floor = 0.06, ceiling = 0.98): Float32Array {
  let max = 0
  for (let i = 0; i < peaks.length; i++) {
    if (peaks[i] > max) max = peaks[i]
  }
  const out = new Float32Array(peaks.length)
  if (max <= 1e-6) return out
  const scale = ceiling / max
  for (let i = 0; i < peaks.length; i++) {
    out[i] = Math.max(floor, Math.min(ceiling, peaks[i] * scale))
  }
  return out
}

async function decodeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const Ctx = typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : null
  if (!Ctx) throw new Error("Web Audio API unavailable")
  const ctx = new Ctx()
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    void ctx.close()
  }
}

export async function fetchAudioArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { mode: "cors", credentials: "omit" })
  if (!res.ok) throw new Error(`Failed to fetch audio (${res.status})`)
  return res.arrayBuffer()
}

export async function loadAudioBufferFromUrl(url: string): Promise<AudioBuffer> {
  const ab = await fetchAudioArrayBuffer(url)
  return decodeAudioBuffer(ab)
}

export async function loadAudioBufferFromFile(file: File): Promise<AudioBuffer> {
  const ab = await file.arrayBuffer()
  return decodeAudioBuffer(ab)
}

export function computePeakSet(
  buffer: AudioBuffer,
  barCount = DEFAULT_BAR_COUNT,
  window: WaveformWindow = { startSec: 0, durationSec: buffer.duration }
): WaveformPeakSet {
  const startSec = Math.max(0, window.startSec)
  const durationSec = Math.min(window.durationSec, Math.max(0.01, buffer.duration - startSec))
  const startSample = Math.floor(startSec * buffer.sampleRate)
  const endSample = Math.min(buffer.length, startSample + Math.floor(durationSec * buffer.sampleRate))
  const span = Math.max(1, endSample - startSample)

  const channels = buffer.numberOfChannels
  const left = buffer.getChannelData(0)
  const right = channels > 1 ? buffer.getChannelData(1) : left

  const bars = new Float32Array(barCount)
  const stereoSpread = new Float32Array(barCount)
  const block = span / barCount

  for (let i = 0; i < barCount; i++) {
    const from = startSample + Math.floor(i * block)
    const to = startSample + Math.floor((i + 1) * block)
    let peak = 0
    let spreadAcc = 0
    let count = 0
    for (let s = from; s < to; s++) {
      const l = left[s] ?? 0
      const r = right[s] ?? 0
      const mono = (Math.abs(l) + Math.abs(r)) * 0.5
      if (mono > peak) peak = mono
      const denom = Math.max(Math.abs(l), Math.abs(r), 1e-6)
      spreadAcc += Math.abs(l - r) / denom
      count++
    }
    bars[i] = peak
    stereoSpread[i] = count > 0 ? spreadAcc / count : 0
  }

  return {
    bars: normalizePeaks(bars),
    stereoSpread,
    duration: buffer.duration,
    barCount,
    windowStart: startSec,
    windowDuration: durationSec,
  }
}

export async function loadWaveformPeaks(
  source: string | File,
  options?: { barCount?: number; window?: WaveformWindow }
): Promise<WaveformPeakSet> {
  const barCount = options?.barCount ?? DEFAULT_BAR_COUNT
  const window = options?.window ?? { startSec: 0, durationSec: Number.POSITIVE_INFINITY }

  if (typeof source === "string") {
    const key = cacheKey(source, barCount, {
      startSec: window.startSec,
      durationSec: window.durationSec === Number.POSITIVE_INFINITY ? 0 : window.durationSec,
    })
    const cached = peakCache.get(key)
    if (cached) return cached

    const buffer = await loadAudioBufferFromUrl(source)
    const resolvedWindow = {
      startSec: window.startSec,
      durationSec:
        window.durationSec === Number.POSITIVE_INFINITY
          ? Math.min(120, buffer.duration)
          : Math.min(window.durationSec, buffer.duration - window.startSec),
    }
    const peaks = computePeakSet(buffer, barCount, resolvedWindow)
    peakCache.set(key, peaks)
    return peaks
  }

  const buffer = await loadAudioBufferFromFile(source)
  const resolvedWindow = {
    startSec: window.startSec,
    durationSec:
      window.durationSec === Number.POSITIVE_INFINITY
        ? Math.min(120, buffer.duration)
        : Math.min(window.durationSec, buffer.duration - window.startSec),
  }
  return computePeakSet(buffer, barCount, resolvedWindow)
}

export function clearWaveformCache() {
  peakCache.clear()
}
