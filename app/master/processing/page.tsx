"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { motion } from "framer-motion"
import CinematicBackground from "../../components/CinematicBackground"
import { appendHistory } from "../../../lib/history"
import { PUBLIC_BACKEND_API_BASE } from "../../../lib/publicBackendUrl"
import { useMasterSession } from "../MasterSessionProvider"

const API = PUBLIC_BACKEND_API_BASE

/** Display steps — must stay in sync with timed progression before the API call */
const UI_STEPS = [
  "Analyzing mix",
  "Balancing EQ",
  "Optimizing dynamics",
  "Enhancing stereo image",
  "Finalizing master",
] as const

const STEP_DELAYS_MS = [480, 620, 620, 720, 400] as const

function AudioWaveIcon({ className }: { className?: string }) {
  const heightsPx = [14, 24, 32, 22, 17]
  return (
    <div className={`flex h-14 w-14 items-end justify-center gap-[5px] md:h-16 md:w-16 ${className ?? ""}`} aria-hidden>
      {heightsPx.map((h, i) => (
        <motion.div
          key={i}
          className="w-[5px] rounded-full bg-gradient-to-t from-violet-400 via-purple-400 to-fuchsia-300/95"
          style={{ height: h, transformOrigin: "bottom" }}
          animate={{ scaleY: [0.88, 1.06, 0.9, 1.04, 0.88] }}
          transition={{
            duration: 1.45 + i * 0.06,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  )
}

export default function MasterProcessingPage() {
  const router = useRouter()
  const { file, sessionHydrated, setMasteredUrl, setMasteredPreviewMp3Url, setAnalysisBefore, setAnalysisAfter } =
    useMasterSession()
  /** Index of the step currently in progress (0–4). */
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
      for (let i = 0; i < UI_STEPS.length; i++) {
        if (cancelled) return
        setActiveStep(i)
        await sleep(STEP_DELAYS_MS[i] ?? 600)
      }

      try {
        const formData = new FormData()
        formData.append("file", file)

        const masterUrl = `${API}/master`
        const res = await axios.post(masterUrl, formData, { signal: ac.signal })
        if (cancelled) return

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

        await sleep(420)
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
  }, [sessionHydrated, file, router, setMasteredUrl, setMasteredPreviewMp3Url, setAnalysisBefore, setAnalysisAfter])

  return (
    <div className="relative flex w-full flex-col items-center overflow-hidden px-5 py-8 text-white md:px-8 md:py-10">
      <CinematicBackground intensity="strong" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-[22rem] text-[1.65rem] font-bold leading-tight tracking-tight text-white sm:text-[1.85rem] md:max-w-none md:text-[2rem]"
        >
          AI is mastering your track
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: "easeOut" }}
          className="mt-3 text-[13px] leading-relaxed text-white/42 md:text-sm"
        >
          This usually takes 30–60 seconds.
        </motion.p>

        {/* Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="relative mt-12 flex w-[min(17.5rem,78vw)] shrink-0 items-center justify-center md:mt-14 md:w-[min(19rem,72vw)]"
        >
          <motion.div
            className="pointer-events-none absolute inset-[-18%] rounded-full bg-gradient-to-tr from-violet-600/25 via-indigo-500/12 to-sky-500/20 blur-3xl"
            animate={{ opacity: [0.55, 0.75, 0.55], scale: [1, 1.06, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute inset-[-8%] rounded-full bg-violet-500/10 blur-2xl"
            animate={{ opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />

          <div className="relative rounded-full p-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/[0.04]">
            <div
              className="rounded-full p-[2.5px] md:p-[3px]"
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #6366f1 45%, #38bdf8 100%)",
              }}
            >
              <motion.div
                className="relative flex h-[10.25rem] w-[10.25rem] items-center justify-center rounded-full bg-[#07070a]/95 backdrop-blur-md md:h-[11.25rem] md:w-[11.25rem]"
                animate={{ boxShadow: ["0 0 0 0 rgba(139,92,246,0)", "0 0 48px rgba(99,102,241,0.12)", "0 0 0 0 rgba(139,92,246,0)"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div
                  className="absolute inset-[18%] rounded-full bg-gradient-to-b from-violet-500/12 to-transparent blur-xl"
                  animate={{ opacity: [0.4, 0.65, 0.4] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />
                <div className="relative z-[1] flex items-center justify-center">
                  <AudioWaveIcon />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Progress card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="mt-12 w-full max-w-[22rem] rounded-2xl border border-white/[0.07] bg-black/[0.42] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_56px_rgba(0,0,0,0.45)] backdrop-blur-xl md:mt-14 md:max-w-md md:px-6 md:py-6"
        >
          <ul className="flex flex-col gap-4 text-left">
            {UI_STEPS.map((label, i) => {
              const done = i < activeStep
              const active = i === activeStep
              const pending = i > activeStep

              return (
                <li
                  key={label}
                  className={`flex items-center gap-3.5 text-[13px] leading-snug transition-colors md:text-sm ${
                    done ? "text-white/92" : active ? "text-white" : "text-white/32"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
                    {done ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/[0.12] ring-1 ring-emerald-400/25">
                        <svg className="h-3.5 w-3.5 text-emerald-400/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : active ? (
                      <motion.span
                        className="relative flex h-6 w-6 items-center justify-center"
                        initial={false}
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span className="absolute inset-0 rounded-full bg-violet-500/20 blur-md" />
                        <span className="relative flex h-5 w-5 items-center justify-center rounded-full border border-violet-400/45 bg-violet-500/[0.15] shadow-[0_0_14px_rgba(139,92,246,0.22)]">
                          <span className="h-2 w-2 rounded-full bg-violet-200/90" />
                        </span>
                      </motion.span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02]" />
                    )}
                  </span>
                  <span className="font-medium">{label}</span>
                </li>
              )
            })}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
