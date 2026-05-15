"use client"

import { useEffect, useRef, useState } from "react"
import {
  DEFAULT_BAR_COUNT,
  densifyPeaks,
  loadWaveformPeaks,
  type WaveformPeakSet,
  type WaveformWindow,
} from "./waveform.utils"

export type UseWaveformDataOptions = {
  barCount?: number
  window?: WaveformWindow
  enabled?: boolean
  /** Slightly lift peaks — used for mastered variant */
  densify?: boolean
}

export type UseWaveformDataResult = {
  peaks: WaveformPeakSet | null
  loading: boolean
  error: string | null
}

export function useWaveformData(
  source: string | File | null | undefined,
  options?: UseWaveformDataOptions
): UseWaveformDataResult {
  const enabled = options?.enabled !== false
  const barCount = options?.barCount ?? DEFAULT_BAR_COUNT
  const window = options?.window
  const densify = options?.densify ?? false

  const [peaks, setPeaks] = useState<WaveformPeakSet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    if (!enabled || !source) {
      setPeaks(null)
      setLoading(false)
      setError(null)
      return
    }

    const id = ++requestId.current
    setLoading(true)
    setError(null)

    loadWaveformPeaks(source, { barCount, window })
      .then((data) => {
        if (requestId.current !== id) return
        if (densify) {
          setPeaks({
            ...data,
            bars: densifyPeaks(data.bars),
          })
        } else {
          setPeaks(data)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (requestId.current !== id) return
        setPeaks(null)
        setLoading(false)
        setError(err instanceof Error ? err.message : "Could not load waveform")
      })

    return () => {
      requestId.current++
    }
  }, [source, enabled, barCount, densify, window?.startSec, window?.durationSec])

  return { peaks, loading, error }
}
