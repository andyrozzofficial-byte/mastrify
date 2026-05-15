"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { motion } from "framer-motion"
import CinematicBackground from "../../components/CinematicBackground"
import CinematicWaveform from "../../components/audio/CinematicWaveform"
import MasteringEngineVisual from "./MasteringEngineVisual"
import ProcessingStageList, { PROCESSING_STEPS } from "./ProcessingStageList"
import { appendHistory } from "../../../lib/history"
import { PUBLIC_BACKEND_API_BASE } from "../../../lib/publicBackendUrl"
import { MASTRIFY_CLIENT_LUFS_TRACE, MASTRIFY_CLIENT_PIPELINE_DEBUG } from "../../../lib/mastrifyDebug"
import { useMasterSession } from "../MasterSessionProvider"

const API = PUBLIC_BACKEND_API_BASE

const STEP_DELAYS_MS = [520, 680, 680, 780, 480] as const

export default function MasterProcessingPage() {
  const router = useRouter()
  const {
    file,
    audioUrl,
    sessionHydrated,
    setMasteredUrl,
    setMasteredPreviewMp3Url,
    setAnalysisBefore,
    setAnalysisAfter,
    stylePreset,
    targetLufs,
    stereoEnhance,
    lowEndControl,
    clarityPresence,
  } = useMasterSession()
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!sessionHydrated) return
    if (!file) {
      router.replace("/master")
      return
    }

    let cancelled = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const ac = new AbortController()

    const run = async () => {
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        if (cancelled) return
        setActiveStep(i)
        await sleep(STEP_DELAYS_MS[i] ?? 600)
      }

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("stylePreset", stylePreset)
        formData.append("targetLufs", String(targetLufs))
        formData.append("stereoEnhance", String(stereoEnhance))
        formData.append("lowEndControl", String(lowEndControl))
        formData.append("clarityPresence", String(clarityPresence))

        const masterUrl = `${API}/master`
        if (MASTRIFY_CLIENT_LUFS_TRACE) {
          console.log("[LUFS_TRACE] client → POST /master", {
            outgoingFormTargetLufs: targetLufs,
            stylePreset,
            resolvedApiBase: API,
            masterUrl,
          })
        }
        const res = await axios.post(masterUrl, formData, { signal: ac.signal })
        if (cancelled) return

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

        setAnalysisBefore((res.data.analysisBefore ?? null) as Record<string, unknown> | null)
        setAnalysisAfter((res.data.analysisAfter ?? null) as Record<string, unknown> | null)

        const mastered =
          res.data.afterUrl || res.data.fullUrl || (res.data.after ? `${API}${res.data.after}` : "")
        const previewMp3 =
          res.data.previewAfterMp3Url ||
          (res.data.previewAfterMp3 ? `${API}${res.data.previewAfterMp3}` : "")

        setMasteredUrl(mastered)
        setMasteredPreviewMp3Url(previewMp3)

        appendHistory({
          kind: "master",
          name: file.name,
          masteredUrl: mastered || undefined,
        })

        await sleep(480)
        if (!cancelled) router.replace("/master/result")
      } catch (e: unknown) {
        const aborted =
          (typeof axios.isCancel === "function" && axios.isCancel(e)) ||
          (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "ERR_CANCELED")
        if (aborted) return
        alert("Mastering failed")
        if (!cancelled) router.replace("/master/settings")
      }
    }

    run()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [
    sessionHydrated,
    file,
    router,
    setMasteredUrl,
    setMasteredPreviewMp3Url,
    setAnalysisBefore,
    setAnalysisAfter,
    stylePreset,
    targetLufs,
    stereoEnhance,
    lowEndControl,
    clarityPresence,
  ])

  return (
    <motion.div
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <CinematicBackground intensity="strong" />

      {/* Ambient lab depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_12%,rgba(99,102,241,0.14),transparent_58%),radial-gradient(ellipse_50%_40%_at_85%_75%,rgba(34,211,238,0.06),transparent_50%)]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[18%] h-[min(520px,70vw)] w-[min(680px,95vw)] -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-[100px]"
        animate={{ opacity: [0.5, 0.75, 0.5], scale: [1, 1.04, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <motion.header
        className="relative z-20 flex shrink-0 items-center justify-center px-6 pt-8 md:pt-10"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/70 backdrop-blur-md">
          Spatial mastering engine
        </span>
      </motion.header>

      <div className="relative z-10 mx-auto flex w-full max-w-[52rem] flex-1 flex-col items-center justify-center px-5 pb-10 pt-4 md:px-8 md:pb-14">
        <motion.div
          className="w-full max-w-xl text-center md:max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200/45 md:text-xs">
            Intelligent signal processing
          </p>
          <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2.15rem] md:text-[2.65rem] md:leading-[1.08]">
            Mastering your track
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
              with musical depth
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-white/72 md:text-[15px] md:leading-relaxed">
            Perceptual analysis, transparent dynamics, and spatial balance — tuned to preserve what
            makes your mix unique.
          </p>
        </motion.div>

        <motion.div
          className="relative mt-8 w-full md:mt-10"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <MasteringEngineVisual activeStep={activeStep} />
        </motion.div>

        {(audioUrl || file) && (
          <motion.div
            className="relative mt-5 w-full max-w-lg px-1 md:mt-6 md:max-w-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          >
            <CinematicWaveform
              mode="processing"
              audioSrc={file ?? audioUrl}
              activeStep={activeStep}
              height={72}
              className="shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_48px_rgba(0,0,0,0.35)]"
            />
          </motion.div>
        )}

        <motion.div
          className="relative mt-2 w-full max-w-md md:mt-4 md:max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-b from-violet-500/20 via-transparent to-cyan-500/10 opacity-60 blur-sm"
            animate={{ opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-black/50 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:px-6 md:py-6"
            layout
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_22%,transparent_100%)]"
              aria-hidden
            />
            <ProcessingStageList activeStep={activeStep} />
          </motion.div>
        </motion.div>

        <motion.p
          className="mt-6 text-center text-[12px] tracking-wide text-white/60 md:text-[13px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          Typically 30–60 seconds · Do not close this window
        </motion.p>
      </div>
    </motion.div>
  )
}
