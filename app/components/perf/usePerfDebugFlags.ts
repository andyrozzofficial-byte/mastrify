"use client"

import { useEffect, useMemo, useState } from "react"

export type PerfDebugFlags = {
  disableAssistant: boolean
  disableOrbAnimations: boolean
  disableWaveforms: boolean
}

const DEFAULT_FLAGS: PerfDebugFlags = {
  disableAssistant: false,
  disableOrbAnimations: false,
  disableWaveforms: false,
}

export function usePerfDebugFlags(): PerfDebugFlags {
  const [search, setSearch] = useState<string>("")

  useEffect(() => {
    if (typeof window === "undefined") return
    setSearch(window.location.search || "")
  }, [])

  return useMemo(() => {
    if (!search) return DEFAULT_FLAGS
    const sp = new URLSearchParams(search)
    const read = (key: keyof PerfDebugFlags) => sp.get(key) === "true"
    return {
      disableAssistant: read("disableAssistant"),
      disableOrbAnimations: read("disableOrbAnimations"),
      disableWaveforms: read("disableWaveforms"),
    }
  }, [search])
}

