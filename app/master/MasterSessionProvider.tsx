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
  cacheMasterUploadFile,
  getCachedMasterUploadFile,
} from "../../lib/masterWorkflowFileStore"
import {
  clearMasterWorkflowLocal,
  fileToWorkflowMeta,
  isMasterWorkflowPhase,
  logMasterWorkflow,
  readMasterWorkflowLocal,
  stepFromWorkflowPhase,
  workflowPhaseFromStep,
  writeMasterWorkflowLocal,
  type MasterWorkflowPhase,
  type MasterWorkflowState,
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
  deliveryEmail: string
  setDeliveryEmail: (email: string) => void
  masterObjectKey: string
  setMasterObjectKey: (key: string) => void
  masterExpiresAt: string
  setMasterExpiresAt: (expiresAt: string) => void
  /** Stable ID for the current upload → master run (feedback analytics). */
  sessionId: string
  trackDurationSec: number | null
  trackName: string | null
  masterLufs: number | null
  processingTimeMs: number | null
  recordProcessingComplete: (processingTimeMs: number, analysisAfter: Record<string, unknown> | null) => void
  resetSession: () => void
  /** True after first client storage hydrate attempt (for /master/settings gating). */
  sessionHydrated: boolean
  /** Analyze → Master: same file + analysis snapshot as “before master” metrics. */
  seedAnalyzeIntoMasterFlow: (f: File, analysis: Record<string, unknown> | null) => void
  /** After refresh: attach a new File without clearing analysisBefore from storage. */
  reconnectSourceFile: (f: File) => void
  workflowPhase: MasterWorkflowPhase
  setWorkflowPhase: (phase: MasterWorkflowPhase) => void
  /** Last known upload file name (persists in session storage for refresh). */
  storedFileName: string
  /** 1 = Upload, 2 = Settings, 3 = Master */
  currentStep: MasterWorkflowStep
  setCurrentStep: (step: MasterWorkflowStep) => void
  masterWorkflow: MasterWorkflowState
  setMasterWorkflow: (workflow: MasterWorkflowState) => void
  getActiveUploadFile: () => File | null
  /** Validate file, persist session, advance to settings step. */
  handleContinueToSettings: () => boolean
  /** @deprecated Use handleContinueToSettings */
  continueToSettings: () => boolean
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

export function MasterSessionProvider({ children }: { children: ReactNode }) {
  const [file, setFileState] = useState<File | null>(() => getCachedMasterUploadFile())
  const [masterWorkflow, setMasterWorkflowState] = useState<MasterWorkflowState>({
    step: 1,
    uploadedFile: null,
  })
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
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const [workflowPhase, setWorkflowPhaseState] = useState<MasterWorkflowPhase>("upload")
  const [currentStep, setCurrentStep] = useState<MasterWorkflowStep>(1)
  const [storedFileName, setStoredFileName] = useState("")
  const hydrateRan = useRef(false)

  const setWorkflowPhase = useCallback((phase: MasterWorkflowPhase) => {
    setWorkflowPhaseState(phase)
    setCurrentStep(stepFromWorkflowPhase(phase))
  }, [])

  const applyCurrentStep = useCallback(
    (step: MasterWorkflowStep) => {
      setCurrentStep(step)
      setWorkflowPhaseState(workflowPhaseFromStep(step))
      setMasterWorkflowState((prev) => {
        const next = { ...prev, step }
        writeMasterWorkflowLocal({
          step,
          uploadedFile: next.uploadedFile,
          sessionId: sessionId || undefined,
        })
        return next
      })
    },
    [sessionId],
  )

  const setMasterWorkflow = useCallback(
    (workflow: MasterWorkflowState) => {
      setMasterWorkflowState(workflow)
      setCurrentStep(workflow.step)
      setWorkflowPhaseState(workflowPhaseFromStep(workflow.step))
      writeMasterWorkflowLocal({
        step: workflow.step,
        uploadedFile: workflow.uploadedFile,
        sessionId: sessionId || undefined,
      })
    },
    [sessionId],
  )

  const getActiveUploadFile = useCallback((): File | null => {
    return file ?? getCachedMasterUploadFile()
  }, [file])

  const ensureUploadFileAttached = useCallback((): File | null => {
    const active = file ?? getCachedMasterUploadFile()
    if (!active) return null
    if (!file) {
      cacheMasterUploadFile(active)
      setFileState(active)
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(active)
      })
    }
    return active
  }, [file])

  const syncWorkflowLocal = useCallback(
    (step: MasterWorkflowStep, activeFile: File | null) => {
      setMasterWorkflowState((prev) => {
        const uploadedFile = activeFile ? fileToWorkflowMeta(activeFile) : prev.uploadedFile
        writeMasterWorkflowLocal({
          step,
          uploadedFile,
          sessionId: sessionId || undefined,
        })
        return { step, uploadedFile }
      })
    },
    [sessionId],
  )

  const persistSessionSnapshot = useCallback(
    (overrides?: Partial<Pick<MasterSessionSnapshotV2, "workflowPhase" | "fileName" | "sessionId">>) => {
      if (typeof window === "undefined") return
      const phase = overrides?.workflowPhase ?? workflowPhase
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
        fileName: overrides?.fileName ?? file?.name ?? storedFileName,
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
      syncWorkflowLocal(stepFromWorkflowPhase(phase), file)
    },
    [
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
    file,
    storedFileName,
    sessionId,
    trackDurationSec,
    masterLufs,
    processingTimeMs,
    workflowPhase,
    syncWorkflowLocal,
    file,
  ])

  const beginMasterSession = useCallback((f: File) => {
    if (!isBetaFeedbackEnabled()) return
    setSessionId(createMasterSessionId())
    setTrackDurationSec(null)
    setMasterLufs(null)
    setProcessingTimeMs(null)
    void readAudioDurationSec(f).then((sec) => {
      if (sec != null) setTrackDurationSec(sec)
    })
  }, [])

  const recordProcessingComplete = useCallback(
    (elapsedMs: number, analysisAfter: Record<string, unknown> | null) => {
      if (!isBetaFeedbackEnabled()) return
      const ms = Math.max(0, Math.round(elapsedMs))
      setProcessingTimeMs(ms)
      setMasterLufs(extractMasterLufs(analysisAfter))
    },
    []
  )

  const setFile = useCallback(
    (f: File | null) => {
      cacheMasterUploadFile(f)
      setFileState(f)
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return f ? URL.createObjectURL(f) : ""
      })
      setMasteredUrl("")
      setMasteredPreviewMp3Url("")
      setMasterObjectKey("")
      setMasterExpiresAt("")
      if (f) {
        const uploadedFile = fileToWorkflowMeta(f)
        setStoredFileName(f.name)
        setWorkflowPhaseState("upload")
        setCurrentStep(1)
        setMasterWorkflowState({ step: 1, uploadedFile })
        beginMasterSession(f)
        writeMasterWorkflowLocal({
          step: 1,
          uploadedFile,
          sessionId: sessionId || undefined,
        })
        logMasterWorkflow("Upload complete", { fileName: f.name })
      } else {
        setAnalysisBefore(null)
        setAnalysisAfter(null)
        setSessionId("")
        setTrackDurationSec(null)
        setMasterLufs(null)
        setProcessingTimeMs(null)
        setStoredFileName("")
        setWorkflowPhaseState("upload")
        setCurrentStep(1)
        setMasterWorkflowState({ step: 1, uploadedFile: null })
        clearMasterWorkflowLocal()
      }
      if (!f) {
        setAnalysisBefore(null)
        setAnalysisAfter(null)
      }
      clearMasterStorageKeys()
    },
    [beginMasterSession, sessionId]
  )

  const handleContinueToSettings = useCallback((): boolean => {
    console.log("onClick Continue settings")
    const activeFile = ensureUploadFileAttached()
    console.log("uploadedFile exists:", Boolean(activeFile))
    console.log("session exists:", Boolean(sessionId))

    if (!activeFile) {
      console.log("No uploaded file")
      logMasterWorkflow("Continue blocked — no file uploaded")
      return false
    }

    const updated: MasterWorkflowState = {
      step: 2,
      uploadedFile: fileToWorkflowMeta(activeFile),
    }

    setStoredFileName(activeFile.name)
    setMasterWorkflow(updated)
    persistSessionSnapshot({
      workflowPhase: "settings",
      fileName: activeFile.name,
      sessionId: sessionId || undefined,
    })

    console.log("navigate to settings")
    logMasterWorkflow("Settings opened", { fileName: activeFile.name, sessionId: sessionId || "(pending)" })
    return true
  }, [ensureUploadFileAttached, sessionId, persistSessionSnapshot, setMasterWorkflow])

  const reconnectSourceFile = useCallback((f: File) => {
    cacheMasterUploadFile(f)
    setFileState(f)
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setMasterWorkflowState((prev) => ({
      step: prev.step >= 2 ? prev.step : 2,
      uploadedFile: fileToWorkflowMeta(f),
    }))
    setStoredFileName(f.name)
  }, [])

  const seedAnalyzeIntoMasterFlow = useCallback(
    (f: File, analysis: Record<string, unknown> | null) => {
      cacheMasterUploadFile(f)
      setFileState(f)
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(f)
      })
      setAnalysisBefore(cloneAnalysis(analysis))
      setAnalysisAfter(null)
      setMasteredUrl("")
      setMasteredPreviewMp3Url("")
      setMasterObjectKey("")
      setMasterExpiresAt("")
      const uploadedFile = fileToWorkflowMeta(f)
      setMasterWorkflowState({ step: 1, uploadedFile })
      writeMasterWorkflowLocal({ step: 1, uploadedFile, sessionId: sessionId || undefined })
      beginMasterSession(f)
    },
    [beginMasterSession, sessionId]
  )

  const resetSession = useCallback(() => {
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ""
    })
    setFileState(null)
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
    setWorkflowPhaseState("upload")
    setCurrentStep(1)
    setStoredFileName("")
    setMasterWorkflowState({ step: 1, uploadedFile: null })
    cacheMasterUploadFile(null)
    clearMasterWorkflowLocal()
    clearMasterStorageKeys()
  }, [])

  useLayoutEffect(() => {
    if (typeof window === "undefined" || hydrateRan.current) return
    hydrateRan.current = true
    try {
      let raw = sessionStorage.getItem(MASTER_SESSION_STORAGE_KEY)
      if (!raw) raw = sessionStorage.getItem(MASTER_RESULT_STORAGE_KEY)
      const localWorkflow = readMasterWorkflowLocal()
      if (localWorkflow) {
        setCurrentStep(localWorkflow.step)
        setWorkflowPhaseState(workflowPhaseFromStep(localWorkflow.step))
        setMasterWorkflowState({
          step: localWorkflow.step,
          uploadedFile: localWorkflow.uploadedFile ?? null,
        })
        if (localWorkflow.uploadedFile?.name) {
          setStoredFileName(localWorkflow.uploadedFile.name)
        }
        if (localWorkflow.sessionId?.trim() && !sessionId) {
          setSessionId(localWorkflow.sessionId.trim())
        }
        logMasterWorkflow("Session restored", {
          step: localWorkflow.step,
          fileName: localWorkflow.uploadedFile?.name ?? null,
          sessionId: localWorkflow.sessionId ?? null,
        })
      }

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
        if (typeof s.masterObjectKey === "string") setMasterObjectKey(s.masterObjectKey)
        if (typeof s.masterExpiresAt === "string") setMasterExpiresAt(s.masterExpiresAt)
        if (typeof s.deliveryEmail === "string") setDeliveryEmail(s.deliveryEmail)
        if (typeof s.sessionId === "string" && s.sessionId.trim()) {
          setSessionId(s.sessionId.trim())
        } else if (s.masteredUrl || s.fileName) {
          setSessionId(createMasterSessionId())
        }
        if (typeof s.trackDurationSec === "number" && Number.isFinite(s.trackDurationSec)) {
          setTrackDurationSec(s.trackDurationSec)
        }
        if (typeof s.masterLufs === "number" && Number.isFinite(s.masterLufs)) {
          setMasterLufs(s.masterLufs)
        }
        if (typeof s.processingTimeMs === "number" && Number.isFinite(s.processingTimeMs)) {
          setProcessingTimeMs(Math.round(s.processingTimeMs))
        }
        if (typeof s.fileName === "string" && s.fileName.trim()) {
          setStoredFileName(s.fileName.trim())
        }
        if (isMasterWorkflowPhase(s.workflowPhase)) {
          setWorkflowPhaseState(s.workflowPhase)
          setCurrentStep(stepFromWorkflowPhase(s.workflowPhase))
        } else if (s.masteredUrl || s.analysisAfter) {
          setWorkflowPhaseState("master")
          setCurrentStep(3)
        } else if (s.fileName || s.sessionId) {
          setWorkflowPhaseState("settings")
          setCurrentStep(2)
        }
        syncWorkflowLocal(
          stepFromWorkflowPhase(
            isMasterWorkflowPhase(s.workflowPhase)
              ? s.workflowPhase
              : s.masteredUrl || s.analysisAfter
                ? "master"
                : "settings",
          ),
          null,
        )
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
      deliveryEmail,
      masteredUrl,
      masteredPreviewMp3Url,
      masterObjectKey,
      masterExpiresAt,
      fileName: file?.name ?? "",
      sessionId,
      trackDurationSec,
      masterLufs,
      processingTimeMs,
      workflowPhase,
    }
    const hasPayload =
      !!masteredUrl ||
      !!analysisBefore ||
      !!analysisAfter ||
      !!file ||
      !!masterObjectKey ||
      !!masterExpiresAt ||
      workflowPhase !== "upload" ||
      currentStep > 1 ||
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
    if (file?.name) setStoredFileName(file.name)
    try {
      sessionStorage.setItem(MASTER_SESSION_STORAGE_KEY, JSON.stringify(payload))
      syncWorkflowLocal(currentStep, file)
    } catch {
      /* ignore quota */
    }
  }, [
    sessionHydrated,
    workflowPhase,
    currentStep,
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
    file,
    sessionId,
    trackDurationSec,
    masterLufs,
    processingTimeMs,
  ])

  const trackName = useMemo(
    () => formatTrackNameForAnalytics(file?.name),
    [file?.name]
  )

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
      deliveryEmail,
      setDeliveryEmail,
      masterObjectKey,
      setMasterObjectKey,
      masterExpiresAt,
      setMasterExpiresAt,
      sessionId,
      trackDurationSec,
      trackName,
      masterLufs,
      processingTimeMs,
      recordProcessingComplete,
      resetSession,
      sessionHydrated,
      seedAnalyzeIntoMasterFlow,
      reconnectSourceFile,
      workflowPhase,
      setWorkflowPhase,
      storedFileName,
      currentStep,
      setCurrentStep: applyCurrentStep,
      masterWorkflow,
      setMasterWorkflow,
      getActiveUploadFile,
      handleContinueToSettings,
      continueToSettings: handleContinueToSettings,
      persistSessionSnapshot,
    }),
    [
      file,
      setFile,
      audioUrl,
      setAudioUrl,
      masteredUrl,
      masteredPreviewMp3Url,
      masterObjectKey,
      masterExpiresAt,
      analysisBefore,
      analysisAfter,
      stylePreset,
      targetLufs,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      deliveryEmail,
      sessionId,
      trackDurationSec,
      trackName,
      masterLufs,
      processingTimeMs,
      recordProcessingComplete,
      resetSession,
      sessionHydrated,
      seedAnalyzeIntoMasterFlow,
      reconnectSourceFile,
      workflowPhase,
      storedFileName,
      currentStep,
      applyCurrentStep,
      masterWorkflow,
      setMasterWorkflow,
      getActiveUploadFile,
      handleContinueToSettings,
      persistSessionSnapshot,
      syncWorkflowLocal,
    ]
  )

  useEffect(() => {
    if (!sessionHydrated || workflowPhase !== "settings") return
    persistSessionSnapshot()
  }, [sessionHydrated, workflowPhase, persistSessionSnapshot])

  return <MasterSessionContext.Provider value={value}>{children}</MasterSessionContext.Provider>
}

export function useMasterSession() {
  const ctx = useContext(MasterSessionContext)
  if (!ctx) throw new Error("useMasterSession must be used within MasterSessionProvider")
  return ctx
}
