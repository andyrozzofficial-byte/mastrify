"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import axios from "axios"
import { motion, useReducedMotion } from "framer-motion"
import MarketingPageFrame from "../../components/cinematic/MarketingPageFrame"
import CinematicOrbCenter from "../../components/cinematic/CinematicOrbCenter"
import CinematicWaveform from "../../components/audio/CinematicWaveform"
import ProcessingStageList, { PROCESSING_STEPS } from "./ProcessingStageList"
import "../../components/cinematic/product-processing-view.css"
import { appendHistory } from "../../../lib/history"
import { PUBLIC_BACKEND_API_BASE } from "../../../lib/publicBackendUrl"
import { MASTRIFY_CLIENT_LUFS_TRACE, MASTRIFY_CLIENT_PIPELINE_DEBUG } from "../../../lib/mastrifyDebug"
import { logResourceClient } from "../../../lib/resourceUsageLogClient"
import { useBetaMasteringGate } from "../../components/beta/BetaMasteringGateProvider"
import { extractMasterLufs } from "../../../lib/extractMasterLufs"
import { masteringStyleLabel } from "../../../lib/masterStyleLabels"
import { reportBetaMasterCompleted } from "../../../lib/betaMasterTrackingClient"
import { getStoredBetaEmail } from "../../../lib/betaSessionStorage"
import { useMasterSession } from "../MasterSessionProvider"

const API = PUBLIC_BACKEND_API_BASE

const STEP_DELAYS_MS = [520, 680, 680, 780, 480] as const

function stringField(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function objectKeyFromAfterPath(after: unknown): string {
  const raw = stringField(after).trim()
  if (!raw) return ""
  const match = raw.match(/^\/?masters\/([^?#]+)$/)
  return match?.[1] ?? ""
}

function sliderDebugEnabled() {
  if (typeof window === "undefined") return false
  try {
    const raw = window.localStorage.getItem("mastrify:slider-debug")
    return raw === "1" || raw === "true" || raw === "on"
  } catch {
    return false
  }
}

const PROCESSING_EASE = [0.22, 1, 0.36, 1] as const

export default function MasterProcessingPage() {
  const router = useRouter()
  const pathname = usePathname()
  const onMasterRoot = pathname === "/master" || pathname === "/master/"
  const reduce = useReducedMotion()
  const { isBeta, checking, refreshAccess, applyBetaSession } = useBetaMasteringGate()
  const {
    masterState,
    setMasterState,
    file,
    audioUrl,
    sessionHydrated,
    sessionId,
    ensureSessionId,
    masterObjectKey,
    masteredUrl,
    setMasteredUrl,
    setMasteredPreviewMp3Url,
    setMasterObjectKey,
    setMasterExpiresAt,
    setAnalysisBefore,
    setAnalysisAfter,
    recordProcessingComplete,
    stylePreset,
    targetLufs,
    stereoEnhance,
    lowEndControl,
    clarityPresence,
  } = useMasterSession()
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (checking) return
    const activeFile = masterState.file ?? file
    if (!activeFile) {
      console.log("[master-workflow] processing: no file, abort")
      if (onMasterRoot) {
        setMasterState({ step: 1, file: null })
      } else {
        router.replace("/master")
      }
      return
    }
    if (!isBeta) {
      console.log("[master-workflow] processing: not beta, abort")
      if (onMasterRoot) {
        setMasterState({ step: 2, file: activeFile })
      } else {
        router.replace("/master")
      }
      return
    }

    let cancelled = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const ac = new AbortController()
    const effectRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    logResourceClient("processing effect mounted", {
      effectRunId,
      fileName: activeFile.name,
      fileSize: activeFile.size,
      sessionId,
      hasExistingMasteredUrl: Boolean(masteredUrl),
      hasExistingObjectKey: Boolean(masterObjectKey),
    })

    const run = async () => {
      if (masteredUrl) {
        logResourceClient("POST /master would duplicate (masteredUrl already set)", {
          effectRunId,
          masteredUrlHost: (() => {
            try {
              return new URL(masteredUrl).host
            } catch {
              return null
            }
          })(),
        })
      }
      const processingStartedAt = Date.now()
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        if (cancelled) return
        setActiveStep(i)
        await sleep(STEP_DELAYS_MS[i] ?? 600)
      }

      try {
        const formData = new FormData()
        formData.append("file", activeFile)
        formData.append("stylePreset", stylePreset)
        formData.append("targetLufs", String(targetLufs))
        formData.append("stereoEnhance", String(stereoEnhance))
        formData.append("lowEndControl", String(lowEndControl))
        formData.append("clarityPresence", String(clarityPresence))
        formData.append("trackTitle", activeFile.name)
        const sliderDebug = sliderDebugEnabled()
        if (sliderDebug) formData.append("sliderDebug", "1")

        const masterUrl = `${API}/master`
        logResourceClient("POST /master start", {
          effectRunId,
          fileName: activeFile.name,
          fileSize: activeFile.size,
          masterUrl,
        })
        if (MASTRIFY_CLIENT_LUFS_TRACE) {
          console.log("[LUFS_TRACE] client → POST /master", {
            outgoingFormTargetLufs: targetLufs,
            stylePreset,
            sliderDebug,
            resolvedApiBase: API,
            masterUrl,
          })
        }
        const res = await axios.post(masterUrl, formData, { signal: ac.signal })
        if (cancelled) return

        logResourceClient("POST /master completed", {
          effectRunId,
          afterUrl: res.data.afterUrl ?? res.data.fullUrl,
          objectKey: res.data.objectKey,
          storage: res.data.pipelineDebug?.storage,
        })

        if (MASTRIFY_CLIENT_LUFS_TRACE) {
          const aa = res.data.analysisAfter as Record<string, unknown> | undefined
          console.log("[LUFS_TRACE] AUTHORITY_CLIENT_AXIOS analysisAfter.lufs=", aa?.lufs)
        }

        if (MASTRIFY_CLIENT_PIPELINE_DEBUG) {
          console.log("[pipeline] client POST /master response", {
            afterUrl: res.data.afterUrl,
            analysisAfter: res.data.analysisAfter,
          })
        }

        const analysisBeforePayload = (res.data.analysisBefore ?? null) as Record<string, unknown> | null
        const analysisAfterPayload = (res.data.analysisAfter ?? null) as Record<string, unknown> | null
        const elapsedMs = Date.now() - processingStartedAt
        setAnalysisBefore(analysisBeforePayload)
        setAnalysisAfter(analysisAfterPayload)
        recordProcessingComplete(elapsedMs, analysisAfterPayload)

        const responseObjectKey =
          stringField(res.data.objectKey) ||
          stringField(res.data.object_key) ||
          stringField(res.data.pipelineDebug?.objectKey) ||
          objectKeyFromAfterPath(res.data.after)

        if (isBeta) {
          const trackingSessionId = ensureSessionId()
          const email = getStoredBetaEmail()
          await reportBetaMasterCompleted(
            {
              sessionId: trackingSessionId,
              objectKey: responseObjectKey || masterObjectKey || null,
              email: email || undefined,
              trackName: activeFile.name,
              masteringStyle: masteringStyleLabel(stylePreset),
              processingTimeMs: elapsedMs,
              masterLufs: extractMasterLufs(analysisAfterPayload),
            },
            {
              refreshAccess,
              applyBetaUi: (ui) => {
                if (ui) {
                  applyBetaSession({
                    isBetaUser: true,
                    isBeta: true,
                    complete: true,
                    betaUi: ui,
                    email: email || undefined,
                  })
                }
              },
            },
          )
        }

        const mastered =
          res.data.afterUrl || res.data.fullUrl || (res.data.after ? `${API}${res.data.after}` : "")
        const previewMp3 =
          res.data.previewAfterMp3Url ||
          (res.data.previewAfterMp3 ? `${API}${res.data.previewAfterMp3}` : "")

        const responseExpiresAt =
          stringField(res.data.expiresAt) ||
          stringField(res.data.expires_at) ||
          stringField(res.data.pipelineDebug?.expiresAt)

        setMasteredUrl(mastered)
        setMasteredPreviewMp3Url(previewMp3)
        setMasterObjectKey(responseObjectKey)
        setMasterExpiresAt(responseExpiresAt)

        appendHistory({
          kind: "master",
          name: activeFile.name,
          masteredUrl: mastered || undefined,
        })

        await sleep(480)
        if (!cancelled) router.replace("/master/result")
      } catch (e: unknown) {
        const aborted =
          (typeof axios.isCancel === "function" && axios.isCancel(e)) ||
          (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "ERR_CANCELED")
        if (aborted) {
          logResourceClient("POST /master aborted", { effectRunId })
          return
        }
        logResourceClient("POST /master failed", { effectRunId, error: String(e) })
        alert("Mastering failed")
        if (!cancelled) setMasterState({ step: 2, file: activeFile })
      }
    }

    run()
    return () => {
      cancelled = true
      ac.abort()
      logResourceClient("processing effect cleanup", { effectRunId })
    }
  }, [
    checking,
    isBeta,
    onMasterRoot,
    masterState.file,
    file,
    masteredUrl,
    masterObjectKey,
    setMasterState,
    setMasteredUrl,
    setMasteredPreviewMp3Url,
    setMasterObjectKey,
    setMasterExpiresAt,
    setAnalysisBefore,
    setAnalysisAfter,
    recordProcessingComplete,
    sessionId,
    refreshAccess,
    applyBetaSession,
    stylePreset,
    targetLufs,
    stereoEnhance,
    lowEndControl,
    clarityPresence,
  ])

  return (
    <MarketingPageFrame>
      <div className="page-container product-flow-page-bottom w-full">
      <div className={`product-processing-view ${reduce ? "" : "product-processing-view--enter"}`}>
        <div className="product-processing-view__ambient" aria-hidden />
        <div className="product-processing-view__glow" aria-hidden />

        <header className="product-processing-header">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/70">
            Spatial mastering engine
          </span>
          <div className="product-processing-header__copy">
            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200/45 md:text-xs">
              Intelligent signal processing
            </p>
            <h1 className="mt-3 text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2rem] md:text-[2.35rem]">
              Mastering your track
              <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
                with musical depth
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-white/72 md:text-[15px] md:leading-relaxed">
              Perceptual analysis, transparent dynamics, and spatial balance — tuned to preserve what
              makes your mix unique.
            </p>
          </div>
        </header>

        <div className="product-processing-stage">
          <CinematicOrbCenter activeStep={activeStep} />

          {(audioUrl || masterState.file || file) && (
            <motion.div
              className="cinematic-waveform-slot relative min-h-[4.75rem] overflow-hidden"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: PROCESSING_EASE }}
            >
              <CinematicWaveform
                mode="processing"
                audioSrc={masterState.file ?? file ?? audioUrl}
                activeStep={activeStep}
                height={72}
                className="shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_48px_rgba(0,0,0,0.35)]"
              />
            </motion.div>
          )}
        </div>

        <div className="product-processing-card">
          <div className="product-processing-card__halo" aria-hidden />
          <div className="product-surface-card fluid-surface relative overflow-hidden p-4 sm:p-6">
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_22%,transparent_100%)]"
              aria-hidden
            />
            <ProcessingStageList activeStep={activeStep} />
          </div>
          <p className="product-processing-footnote text-[12px] tracking-wide text-white/60 md:text-[13px]">
            Typically 30–60 seconds · Do not close this window
          </p>
        </div>
      </div>
      </div>
    </MarketingPageFrame>
  )
}
