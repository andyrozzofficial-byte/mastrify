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
import { extractMasterLufs } from "../../lib/extractMasterLufs"
import { isBetaFeedbackEnabled } from "../../lib/betaFeedbackFeature"
import { formatTrackNameForAnalytics } from "../../lib/formatTrackNameForAnalytics"
import { createMasterSessionId } from "../../lib/masterSessionId"
import {
  INITIAL_MASTER_STATE,
  workflowPhaseFromStep,
  type MasterState,
  type MasterWorkflowPhase,
  type MasterWorkflowStep,
} from "../../lib/masterWorkflow"
import { readAudioDurationSec } from "../../lib/readAudioDurationSec"

/** @deprecated use MASTER_SESSION_STORAGE_KEY — kept for one-time migration from older builds */
export const MASTER_RESULT_STORAGE_KEY = "mastrify:master-result-v1"

export const MASTER_SESSION_STORAGE_KEY = "mastrify:master-session-v2"

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
  deliveryEmail: string
  masteredUrl: string
  masteredPreviewMp3Url: string
  masterObjectKey: string
  masterExpiresAt: string
  fileName: string
  sessionId: string
  trackDurationSec: number | null
  masterLufs: number | null
  processingTimeMs: number | null
  workflowPhase: MasterWorkflowPhase
}

type MasterSession = {
  masterState: MasterState
  setMasterState: React.Dispatch<React.SetStateAction<MasterState>>
  handleMasterUpload: (file: File) => void
  handleContinueToSettings: () => void
  handleContinueToMaster: () => void
  handleBackToUpload: () => void
  /** @deprecated Use masterState.file */
  file: File | null
  /** @deprecated Use handleMasterUpload */
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
  deliveryEmail: string
  setDeliveryEmail: (email: string) => void
  masterObjectKey: string
  setMasterObjectKey: (key: string) => void
  masterExpiresAt: string
  setMasterExpiresAt: (expiresAt: string) => void
  sessionId: string
  ensureSessionId: () => string
  trackDurationSec: number | null
  trackName: string | null
  masterLufs: number | null
  processingTimeMs: number | null
  recordProcessingComplete: (processingTimeMs: number, analysisAfter: Record<string, unknown> | null) => void
  resetSession: () => void
  sessionHydrated: boolean
  seedAnalyzeIntoMasterFlow: (f: File, analysis: Record<string, unknown> | null) => void
  reconnectSourceFile: (f: File) => void
  /** @deprecated Use masterState.step */
  currentStep: MasterWorkflowStep
  /** @deprecated Use setMasterState */
  setCurrentStep: (step: MasterWorkflowStep) => void
  /** @deprecated Use masterState.step via workflowPhaseFromStep */
  workflowPhase: MasterWorkflowPhase
  setWorkflowPhase: (phase: MasterWorkflowPhase) => void
  storedFileName: string
  continueToSettings: () => void
  handleContinueToSettingsLegacy: () => void
  persistSessionSnapshot: (overrides?: Partial<Pick<MasterSessionSnapshotV2, "workflowPhase" | "fileName" | "sessionId">>) => void
}

const MasterSessionContext = createContext<MasterSession | null>(null)

function clearMasterStorageKeys() {
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.removeItem(MASTER_SESSION_STORAGE_KEY)
    sessionStorage.removeItem(MASTER_RESULT_STORAGE_KEY)
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

function attachFileAudio(setAudioUrl: (fn: (prev: string) => string) => void, file: File) {
  setAudioUrl((prev) => {
    if (prev) URL.revokeObjectURL(prev)
    return URL.createObjectURL(file)
  })
}

export function MasterSessionProvider({ children }: { children: ReactNode }) {
  const [masterState, setMasterState] = useState<MasterState>(INITIAL_MASTER_STATE)
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
  const [deliveryEmail, setDeliveryEmail] = useState("")
  const [masterObjectKey, setMasterObjectKey] = useState("")
  const [masterExpiresAt, setMasterExpiresAt] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [trackDurationSec, setTrackDurationSec] = useState<number | null>(null)
  const [masterLufs, setMasterLufs] = useState<number | null>(null)
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null)
  const [sessionHydrated, setSessionHydrated] = useState(true)
  const [storedFileName, setStoredFileName] = useState("")
  const hydrateRan = useRef(false)

  const file = masterState.file
  const currentStep = masterState.step
  const workflowPhase = workflowPhaseFromStep(masterState.step)

  useEffect(() => {
    console.log("[master-workflow] Step changed:", currentStep, "file:", masterState.file?.name ?? null)
  }, [currentStep, masterState.file])

  const beginMasterSession = useCallback((f: File) => {
    setSessionId(createMasterSessionId())
    setTrackDurationSec(null)
    setMasterLufs(null)
    setProcessingTimeMs(null)
    void readAudioDurationSec(f).then((sec) => {
      if (sec != null) setTrackDurationSec(sec)
    })
  }, [])

  const ensureSessionId = useCallback(() => {
    if (sessionId.trim()) return sessionId.trim()
    const id = createMasterSessionId()
    setSessionId(id)
    return id
  }, [sessionId])

  const handleMasterUpload = useCallback(
    (uploaded: File) => {
      let ignored = false
      setMasterState((prev) => {
        if (prev.file?.name === uploaded.name && prev.file?.size === uploaded.size) {
          console.log("[master-workflow] Upload ignored")
          ignored = true
          return prev
        }
        console.log("[master-workflow] Step changed: 1 (upload)")
        return { step: 1, file: uploaded }
      })
      if (ignored) return

      attachFileAudio(setAudioUrl, uploaded)
      setStoredFileName(uploaded.name)
      setMasteredUrl("")
      setMasteredPreviewMp3Url("")
      setMasterObjectKey("")
      setMasterExpiresAt("")
      beginMasterSession(uploaded)
      clearMasterStorageKeys()
    },
    [beginMasterSession],
  )

  const handleContinueToSettings = useCallback(() => {
    console.log("[master-workflow] Continue clicked")
    setMasterState((prev) => {
      if (!prev.file) {
        return prev
      }
      if (prev.step === 2) return prev
      console.log("[master-workflow] Step changed: 2 (settings)")
      return { ...prev, step: 2 }
    })
  }, [])

  const handleContinueToMaster = useCallback(() => {
    setMasterState((prev) => {
      if (!prev.file) return prev
      if (prev.step === 3) return prev
      console.log("[master-workflow] Step changed: 3 (master)")
      return { ...prev, step: 3 }
    })
  }, [])

  const handleBackToUpload = useCallback(() => {
    setMasterState((prev) => {
      if (prev.step === 1) return prev
      console.log("[master-workflow] Step changed: 1 (back to upload)")
      return { ...prev, step: 1 }
    })
  }, [])

  const setCurrentStep = useCallback((step: MasterWorkflowStep) => {
    setMasterState((prev) => ({ ...prev, step }))
  }, [])

  const setWorkflowPhase = useCallback((phase: MasterWorkflowPhase) => {
    const step = phase === "settings" ? 2 : phase === "master" ? 3 : 1
    setMasterState((prev) => ({ ...prev, step: step as MasterWorkflowStep }))
  }, [])

  const persistSessionSnapshot = useCallback(
    (overrides?: Partial<Pick<MasterSessionSnapshotV2, "workflowPhase" | "fileName" | "sessionId">>) => {
      if (typeof window === "undefined") return
      const phase = overrides?.workflowPhase ?? workflowPhaseFromStep(masterState.step)
      const payload: MasterSessionSnapshotV2 = {
        v: 2,
        analysisBefore,
        analysisAfter,
        stylePreset,
        targetLufs,
        stereoEnhance,
        lowEndControl,
        clarityPresence,
        deliveryEmail,
        masteredUrl,
        masteredPreviewMp3Url,
        masterObjectKey,
        masterExpiresAt,
        fileName: overrides?.fileName ?? masterState.file?.name ?? storedFileName,
        sessionId: overrides?.sessionId ?? sessionId,
        trackDurationSec,
        masterLufs,
        processingTimeMs,
        workflowPhase: phase,
      }
      try {
        sessionStorage.setItem(MASTER_SESSION_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        /* ignore quota */
      }
    },
    [
      masterState.step,
      masterState.file?.name,
      analysisBefore,
      analysisAfter,
      stylePreset,
      targetLufs,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      deliveryEmail,
      masteredUrl,
      masteredPreviewMp3Url,
      masterObjectKey,
      masterExpiresAt,
      storedFileName,
      sessionId,
      trackDurationSec,
      masterLufs,
      processingTimeMs,
    ],
  )

  const recordProcessingComplete = useCallback(
    (elapsedMs: number, after: Record<string, unknown> | null) => {
      if (!isBetaFeedbackEnabled()) return
      const ms = Math.max(0, Math.round(elapsedMs))
      setProcessingTimeMs(ms)
      setMasterLufs(extractMasterLufs(after))
    },
    [],
  )

  const setFile = useCallback(
    (f: File | null) => {
      if (f) {
        handleMasterUpload(f)
        return
      }
      console.log("[master-workflow] setFile(null) → reset masterState")
      setMasterState(INITIAL_MASTER_STATE)
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ""
      })
      setAnalysisBefore(null)
      setAnalysisAfter(null)
      setSessionId("")
      setTrackDurationSec(null)
      setMasterLufs(null)
      setProcessingTimeMs(null)
      setStoredFileName("")
      setMasteredUrl("")
      setMasteredPreviewMp3Url("")
      setMasterObjectKey("")
      setMasterExpiresAt("")
      clearMasterStorageKeys()
    },
    [handleMasterUpload],
  )

  const reconnectSourceFile = useCallback((f: File) => {
    setMasterState((prev) => ({
      step: prev.step >= 2 ? prev.step : 2,
      file: f,
    }))
    attachFileAudio(setAudioUrl, f)
    setStoredFileName(f.name)
  }, [])

  const seedAnalyzeIntoMasterFlow = useCallback(
    (f: File, analysis: Record<string, unknown> | null) => {
      setMasterState({ step: 1, file: f })
      attachFileAudio(setAudioUrl, f)
      setAnalysisBefore(cloneAnalysis(analysis))
      setAnalysisAfter(null)
      setMasteredUrl("")
      setMasteredPreviewMp3Url("")
      setMasterObjectKey("")
      setMasterExpiresAt("")
      setStoredFileName(f.name)
      beginMasterSession(f)
      clearMasterStorageKeys()
    },
    [beginMasterSession],
  )

  const resetSession = useCallback(() => {
    console.log("[master-workflow] resetSession → step 1, file null")
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setMasterState(INITIAL_MASTER_STATE)
    setMasteredUrl("")
    setMasteredPreviewMp3Url("")
    setMasterObjectKey("")
    setMasterExpiresAt("")
    setAnalysisBefore(null)
    setAnalysisAfter(null)
    setStylePreset("STREAM")
    setTargetLufs(-14)
    setStereoEnhance(50)
    setLowEndControl(50)
    setClarityPresence(50)
    setDeliveryEmail("")
    setSessionId("")
    setTrackDurationSec(null)
    setMasterLufs(null)
    setProcessingTimeMs(null)
    setStoredFileName("")
    clearMasterStorageKeys()
  }, [])

  useLayoutEffect(() => {
    if (typeof window === "undefined" || hydrateRan.current) return
    hydrateRan.current = true
    try {
      let raw = sessionStorage.getItem(MASTER_SESSION_STORAGE_KEY)
      if (!raw) raw = sessionStorage.getItem(MASTER_RESULT_STORAGE_KEY)
      if (!raw) return

      const snap = JSON.parse(raw) as Record<string, unknown>
      if (snap.v === 2) {
        const s = snap as unknown as MasterSessionSnapshotV2
        if (s.analysisBefore) setAnalysisBefore(cloneAnalysis(s.analysisBefore))
        if (s.analysisAfter) setAnalysisAfter(cloneAnalysis(s.analysisAfter as Record<string, unknown>))
        if (isPreset(s.stylePreset)) setStylePreset(s.stylePreset)
        if (typeof s.targetLufs === "number" && Number.isFinite(s.targetLufs)) setTargetLufs(s.targetLufs)
        if (typeof s.stereoEnhance === "number" && Number.isFinite(s.stereoEnhance)) setStereoEnhance(s.stereoEnhance)
        if (typeof s.lowEndControl === "number" && Number.isFinite(s.lowEndControl)) setLowEndControl(s.lowEndControl)
        if (typeof s.clarityPresence === "number" && Number.isFinite(s.clarityPresence)) setClarityPresence(s.clarityPresence)
        if (typeof s.masteredUrl === "string") setMasteredUrl(s.masteredUrl)
        if (typeof s.masteredPreviewMp3Url === "string") setMasteredPreviewMp3Url(s.masteredPreviewMp3Url)
        if (typeof s.masterObjectKey === "string") setMasterObjectKey(s.masterObjectKey)
        if (typeof s.masterExpiresAt === "string") setMasterExpiresAt(s.masterExpiresAt)
        if (typeof s.deliveryEmail === "string") setDeliveryEmail(s.deliveryEmail)
        if (typeof s.sessionId === "string" && s.sessionId.trim()) {
          setSessionId(s.sessionId.trim())
        }
        if (typeof s.trackDurationSec === "number" && Number.isFinite(s.trackDurationSec)) {
          setTrackDurationSec(s.trackDurationSec)
        }
        if (typeof s.masterLufs === "number" && Number.isFinite(s.masterLufs)) setMasterLufs(s.masterLufs)
        if (typeof s.processingTimeMs === "number" && Number.isFinite(s.processingTimeMs)) {
          setProcessingTimeMs(Math.round(s.processingTimeMs))
        }
        if (typeof s.fileName === "string" && s.fileName.trim()) {
          setStoredFileName(s.fileName.trim())
        }
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
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const payload: MasterSessionSnapshotV2 = {
      v: 2,
      analysisBefore,
      analysisAfter,
      stylePreset,
      targetLufs,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      deliveryEmail,
      masteredUrl,
      masteredPreviewMp3Url,
      masterObjectKey,
      masterExpiresAt,
      fileName: masterState.file?.name ?? "",
      sessionId,
      trackDurationSec,
      masterLufs,
      processingTimeMs,
      workflowPhase: workflowPhaseFromStep(masterState.step),
    }
    const hasPayload =
      !!masteredUrl ||
      !!analysisBefore ||
      !!analysisAfter ||
      !!masterState.file ||
      !!masterObjectKey ||
      !!masterExpiresAt ||
      masterState.step > 1 ||
      stylePreset !== "STREAM" ||
      targetLufs !== -14 ||
      stereoEnhance !== 50 ||
      lowEndControl !== 50 ||
      clarityPresence !== 50 ||
      !!deliveryEmail
    if (!hasPayload) {
      try {
        sessionStorage.removeItem(MASTER_SESSION_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      return
    }
    if (masterState.file?.name) setStoredFileName(masterState.file.name)
    try {
      sessionStorage.setItem(MASTER_SESSION_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore quota */
    }
  }, [
    masterState.step,
    masterState.file,
    analysisBefore,
    analysisAfter,
    stylePreset,
    targetLufs,
    stereoEnhance,
    lowEndControl,
    clarityPresence,
    deliveryEmail,
    masteredUrl,
    masteredPreviewMp3Url,
    masterObjectKey,
    masterExpiresAt,
    sessionId,
    trackDurationSec,
    masterLufs,
    processingTimeMs,
  ])

  const trackName = useMemo(
    () => formatTrackNameForAnalytics(masterState.file?.name),
    [masterState.file?.name],
  )

  const value = useMemo(
    () => ({
      masterState,
      setMasterState,
      handleMasterUpload,
      handleContinueToSettings,
      handleContinueToMaster,
      handleBackToUpload,
      file: masterState.file,
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
      deliveryEmail,
      setDeliveryEmail,
      masterObjectKey,
      setMasterObjectKey,
      masterExpiresAt,
      setMasterExpiresAt,
      sessionId,
      ensureSessionId,
      trackDurationSec,
      trackName,
      masterLufs,
      processingTimeMs,
      recordProcessingComplete,
      resetSession,
      sessionHydrated,
      seedAnalyzeIntoMasterFlow,
      reconnectSourceFile,
      currentStep: masterState.step,
      setCurrentStep,
      workflowPhase: workflowPhaseFromStep(masterState.step),
      setWorkflowPhase,
      storedFileName,
      continueToSettings: handleContinueToSettings,
      handleContinueToSettingsLegacy: handleContinueToSettings,
      persistSessionSnapshot,
    }),
    [
      masterState,
      handleMasterUpload,
      handleContinueToSettings,
      handleContinueToMaster,
      handleBackToUpload,
      setFile,
      audioUrl,
      masteredUrl,
      masteredPreviewMp3Url,
      analysisBefore,
      analysisAfter,
      stylePreset,
      targetLufs,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      deliveryEmail,
      masterObjectKey,
      masterExpiresAt,
      sessionId,
      ensureSessionId,
      trackDurationSec,
      trackName,
      masterLufs,
      processingTimeMs,
      recordProcessingComplete,
      resetSession,
      sessionHydrated,
      seedAnalyzeIntoMasterFlow,
      reconnectSourceFile,
      setCurrentStep,
      setWorkflowPhase,
      storedFileName,
      persistSessionSnapshot,
    ],
  )

  return <MasterSessionContext.Provider value={value}>{children}</MasterSessionContext.Provider>
}

export function useMasterSession() {
  const ctx = useContext(MasterSessionContext)
  if (!ctx) throw new Error("useMasterSession must be used within MasterSessionProvider")
  return ctx
}
