"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

/** @deprecated use MASTER_SESSION_STORAGE_KEY — kept for one-time migration from older builds */
export const MASTER_RESULT_STORAGE_KEY = "mastrify:master-result-v1"

export const MASTER_SESSION_STORAGE_KEY = "mastrify:master-session-v2"

/** Latest POST /master axios analysisAfter snapshot for dev metric-stage logs */
export const MASTER_METRIC_STAGE5_STORAGE_KEY = "mastrify:master-metric-stage5"

export type MasterStylePreset = "STREAM" | "CLUB" | "LOUD" | "WARM" | "FESTIVAL"

type MasterSessionSnapshotV2 = {
  v: 2
  analysisBefore: Record<string, unknown> | null
  analysisAfter: Record<string, unknown> | null
  stylePreset: MasterStylePreset
  targetLufs: number
  stereoEnhance: number
  lowEndControl: number
  clarityPresence: number
  masteredUrl: string
  masteredPreviewMp3Url: string
  fileName: string
}

type MasterSession = {
  file: File | null
  setFile: (f: File | null) => void
  audioUrl: string
  setAudioUrl: (u: string) => void
  masteredUrl: string
  setMasteredUrl: (u: string) => void
  masteredPreviewMp3Url: string
  setMasteredPreviewMp3Url: (u: string) => void
  analysisBefore: Record<string, unknown> | null
  setAnalysisBefore: (a: Record<string, unknown> | null) => void
  analysisAfter: Record<string, unknown> | null
  setAnalysisAfter: (a: Record<string, unknown> | null) => void
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
  /** True after first client storage hydrate attempt (for /master/settings gating). */
  sessionHydrated: boolean
  /** Analyze → Master: same file + analysis snapshot as “before master” metrics. */
  seedAnalyzeIntoMasterFlow: (f: File, analysis: Record<string, unknown> | null) => void
  /** After refresh: attach a new File without clearing analysisBefore from storage. */
  reconnectSourceFile: (f: File) => void
}

const MasterSessionContext = createContext<MasterSession | null>(null)

function clearMasterStorageKeys() {
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.removeItem(MASTER_SESSION_STORAGE_KEY)
    sessionStorage.removeItem(MASTER_RESULT_STORAGE_KEY)
    sessionStorage.removeItem(MASTER_METRIC_STAGE5_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function cloneAnalysis(a: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!a) return null
  try {
    return structuredClone(a) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(JSON.stringify(a)) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function isPreset(x: unknown): x is MasterStylePreset {
  return x === "STREAM" || x === "CLUB" || x === "LOUD" || x === "WARM" || x === "FESTIVAL"
}

export function MasterSessionProvider({ children }: { children: ReactNode }) {
  const [file, setFileState] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [masteredUrl, setMasteredUrl] = useState("")
  const [masteredPreviewMp3Url, setMasteredPreviewMp3Url] = useState("")
  const [analysisBefore, setAnalysisBefore] = useState<Record<string, unknown> | null>(null)
  const [analysisAfter, setAnalysisAfter] = useState<Record<string, unknown> | null>(null)
  const [stylePreset, setStylePreset] = useState<MasterStylePreset>("STREAM")
  const [targetLufs, setTargetLufs] = useState(-14)
  const [stereoEnhance, setStereoEnhance] = useState(50)
  const [lowEndControl, setLowEndControl] = useState(50)
  const [clarityPresence, setClarityPresence] = useState(50)
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const hydrateRan = useRef(false)

  const setFile = useCallback((f: File | null) => {
    setFileState(f)
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : ""
    })
    setMasteredUrl("")
    setMasteredPreviewMp3Url("")
    setAnalysisBefore(null)
    setAnalysisAfter(null)
    clearMasterStorageKeys()
  }, [])

  const reconnectSourceFile = useCallback((f: File) => {
    setFileState(f)
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
  }, [])

  const seedAnalyzeIntoMasterFlow = useCallback((f: File, analysis: Record<string, unknown> | null) => {
    setFileState(f)
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setAnalysisBefore(cloneAnalysis(analysis))
    setAnalysisAfter(null)
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
    setAnalysisBefore(null)
    setAnalysisAfter(null)
    setStylePreset("STREAM")
    setTargetLufs(-14)
    setStereoEnhance(50)
    setLowEndControl(50)
    setClarityPresence(50)
    clearMasterStorageKeys()
  }, [])

  useLayoutEffect(() => {
    if (typeof window === "undefined" || hydrateRan.current) return
    hydrateRan.current = true
    try {
      let raw = sessionStorage.getItem(MASTER_SESSION_STORAGE_KEY)
      if (!raw) raw = sessionStorage.getItem(MASTER_RESULT_STORAGE_KEY)
      if (!raw) {
        setSessionHydrated(true)
        return
      }
      const snap = JSON.parse(raw) as Record<string, unknown>
      if (snap.v === 2) {
        const s = snap as unknown as MasterSessionSnapshotV2
        if (s.analysisBefore) setAnalysisBefore(cloneAnalysis(s.analysisBefore))
        else setAnalysisBefore(null)
        setAnalysisAfter(s.analysisAfter ? cloneAnalysis(s.analysisAfter as Record<string, unknown>) : null)
        if (isPreset(s.stylePreset)) setStylePreset(s.stylePreset)
        if (typeof s.targetLufs === "number" && Number.isFinite(s.targetLufs)) setTargetLufs(s.targetLufs)
        if (typeof s.stereoEnhance === "number" && Number.isFinite(s.stereoEnhance)) setStereoEnhance(s.stereoEnhance)
        if (typeof s.lowEndControl === "number" && Number.isFinite(s.lowEndControl)) setLowEndControl(s.lowEndControl)
        if (typeof s.clarityPresence === "number" && Number.isFinite(s.clarityPresence)) setClarityPresence(s.clarityPresence)
        if (typeof s.masteredUrl === "string") setMasteredUrl(s.masteredUrl)
        if (typeof s.masteredPreviewMp3Url === "string") setMasteredPreviewMp3Url(s.masteredPreviewMp3Url)
      } else if (snap.v === 1) {
        const mastered = typeof snap.masteredUrl === "string" ? snap.masteredUrl : ""
        if (mastered) setMasteredUrl(mastered)
        if (typeof snap.masteredPreviewMp3Url === "string") setMasteredPreviewMp3Url(snap.masteredPreviewMp3Url)
        if (snap.analysisBefore && typeof snap.analysisBefore === "object") {
          setAnalysisBefore(cloneAnalysis(snap.analysisBefore as Record<string, unknown>))
        }
        if (snap.analysisAfter && typeof snap.analysisAfter === "object") {
          setAnalysisAfter(cloneAnalysis(snap.analysisAfter as Record<string, unknown>))
        }
        if (typeof snap.targetLufs === "number" && Number.isFinite(snap.targetLufs)) setTargetLufs(snap.targetLufs)
      }
    } catch {
      /* ignore corrupt storage */
    }
    setSessionHydrated(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !sessionHydrated) return
    const payload: MasterSessionSnapshotV2 = {
      v: 2,
      analysisBefore,
      analysisAfter,
      stylePreset,
      targetLufs,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      masteredUrl,
      masteredPreviewMp3Url,
      fileName: file?.name ?? "",
    }
    const hasPayload =
      !!masteredUrl ||
      !!analysisBefore ||
      !!analysisAfter ||
      !!file ||
      stylePreset !== "STREAM" ||
      targetLufs !== -14 ||
      stereoEnhance !== 50 ||
      lowEndControl !== 50 ||
      clarityPresence !== 50
    if (!hasPayload) {
      try {
        sessionStorage.removeItem(MASTER_SESSION_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      return
    }
    try {
      sessionStorage.setItem(MASTER_SESSION_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore quota */
    }
  }, [
    sessionHydrated,
    analysisBefore,
    analysisAfter,
    stylePreset,
    targetLufs,
    stereoEnhance,
    lowEndControl,
    clarityPresence,
    masteredUrl,
    masteredPreviewMp3Url,
    file,
  ])

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
      analysisBefore,
      setAnalysisBefore,
      analysisAfter,
      setAnalysisAfter,
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
      sessionHydrated,
      seedAnalyzeIntoMasterFlow,
      reconnectSourceFile,
    }),
    [
      file,
      setFile,
      audioUrl,
      setAudioUrl,
      masteredUrl,
      masteredPreviewMp3Url,
      analysisBefore,
      analysisAfter,
      stylePreset,
      targetLufs,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      resetSession,
      sessionHydrated,
      seedAnalyzeIntoMasterFlow,
      reconnectSourceFile,
    ]
  )

  return <MasterSessionContext.Provider value={value}>{children}</MasterSessionContext.Provider>
}

export function useMasterSession() {
  const ctx = useContext(MasterSessionContext)
  if (!ctx) throw new Error("useMasterSession must be used within MasterSessionProvider")
  return ctx
}
