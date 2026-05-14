"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type MasterStylePreset = "STREAM" | "CLUB" | "LOUD" | "WARM" | "FESTIVAL"

type MasterSession = {
  file: File | null
  setFile: (f: File | null) => void
  audioUrl: string
  setAudioUrl: (u: string) => void
  masteredUrl: string
  setMasteredUrl: (u: string) => void
  masteredPreviewMp3Url: string
  setMasteredPreviewMp3Url: (u: string) => void
  stylePreset: MasterStylePreset
  setStylePreset: (s: MasterStylePreset) => void
  targetLufs: number
  setTargetLufs: (n: number) => void
  stereoEnhance: number
  setStereoEnhance: (n: number) => void
  lowEndControl: number
  setLowEndControl: (n: number) => void
  clarityPresence: number
  setClarityPresence: (n: number) => void
  resetSession: () => void
}

const MasterSessionContext = createContext<MasterSession | null>(null)

export function MasterSessionProvider({ children }: { children: ReactNode }) {
  const [file, setFileState] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [masteredUrl, setMasteredUrl] = useState("")
  const [masteredPreviewMp3Url, setMasteredPreviewMp3Url] = useState("")
  const [stylePreset, setStylePreset] = useState<MasterStylePreset>("STREAM")
  const [targetLufs, setTargetLufs] = useState(-14)
  const [stereoEnhance, setStereoEnhance] = useState(50)
  const [lowEndControl, setLowEndControl] = useState(50)
  const [clarityPresence, setClarityPresence] = useState(50)

  const setFile = useCallback((f: File | null) => {
    setFileState(f)
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : ""
    })
    setMasteredUrl("")
    setMasteredPreviewMp3Url("")
  }, [])

  const resetSession = useCallback(() => {
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setFileState(null)
    setMasteredUrl("")
    setMasteredPreviewMp3Url("")
    setStylePreset("STREAM")
    setTargetLufs(-14)
    setStereoEnhance(50)
    setLowEndControl(50)
    setClarityPresence(50)
  }, [])

  const value = useMemo(
    () => ({
      file,
      setFile,
      audioUrl,
      setAudioUrl,
      masteredUrl,
      setMasteredUrl,
      masteredPreviewMp3Url,
      setMasteredPreviewMp3Url,
      stylePreset,
      setStylePreset,
      targetLufs,
      setTargetLufs,
      stereoEnhance,
      setStereoEnhance,
      lowEndControl,
      setLowEndControl,
      clarityPresence,
      setClarityPresence,
      resetSession,
    }),
    [
      file,
      setFile,
      audioUrl,
      masteredUrl,
      masteredPreviewMp3Url,
      stylePreset,
      targetLufs,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      resetSession,
    ]
  )

  return <MasterSessionContext.Provider value={value}>{children}</MasterSessionContext.Provider>
}

export function useMasterSession() {
  const ctx = useContext(MasterSessionContext)
  if (!ctx) throw new Error("useMasterSession must be used within MasterSessionProvider")
  return ctx
}
