"use client"

import { supabase } from "../../lib/supabase"
import { useState, useRef } from "react"
import axios from "axios"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  ANALYSIS_STEP_DELAYS_MS,
  ANALYSIS_STEPS,
} from "../components/analyze/AnalysisStageList"
import AnalyzeProcessingView from "../components/analyze/AnalyzeProcessingView"
import AnalyzeStepRail from "../components/analyze/AnalyzeStepRail"
import AnalyzeUploadHero from "../components/analyze/AnalyzeUploadHero"
import CinematicBackground from "../components/CinematicBackground"
import MetricInsightTile from "../components/analyze/MetricInsightTile"
import ScoreRing from "../components/ScoreRing"
import {
  brightnessPresentation,
  clarityPresentation,
  dynamicRangePresentation,
  energyPresentation,
  heroInsightBullets,
  highsPresentation,
  lowEndPresentation,
  lufsPresentation,
  presentIssue,
  readinessHeadline,
  readinessSubcopy,
  stereoWidthPresentation,
} from "../../lib/analyzeMixPresentation"
import { appendHistory } from "../../lib/history"
import { publicBackendUrl } from "../../lib/publicBackendUrl"
import { AUDIO_UPLOAD_REJECT_MESSAGE, isAcceptedAudioUpload } from "../../lib/audioUploadAccept"
import { useMasterSession } from "../master/MasterSessionProvider"


function generateFixes(result: any) {
  const fixes: any[] = []

  if (!result) return fixes

  if (result.lufs < -12) {
    fixes.push({
      title: "Low output level",
      steps: [
        "Your mix is too quiet compared to commercial tracks",
        "Increase gain BEFORE limiter, not after",
        "Control peaks gently",
        "Increase overall level without distortion",
        "Make sure kick and bass are hitting strong before pushing loudness"
      ]
    })
  }

  if (result.dynamicRange > 14) {
    fixes.push({
      title: "Too much dynamic range",
      steps: [
        "Your mix has too big volume differences between elements",
        "Use bus compression on drums (2–4 dB reduction)",
        "Control peaks with a limiter or soft clipper",
        "Glue instruments together with light compression",
        "Aim for a tighter and more consistent loudness curve"
      ]
    })
  }

  if (result.stereoWidth < 0.2) {
    fixes.push({
      title: "Stereo too narrow",
      steps: [
        "Your mix feels centered and lacks width",
        "Widen pads, FX and synth layers (NOT bass)",
        "Pan percussion slightly left/right",
        "Use stereo imaging on high frequencies only",
        "Keep kick and bass fully mono for power"
      ]
    })
  }

  if (result.brightness < 0.3) {
    fixes.push({
      title: "Lacks brightness",
      steps: [
        "Your mix lacks clarity in the high-end",
        "Boost around 8–12kHz with a gentle shelf EQ",
        "Add saturation to bring out harmonics",
        "Enhance hats, vocals and top layers",
        "Be careful not to make it harsh — aim for clean shine"
      ]
    })
  }

  return fixes
}

function generateIssues(result: any) {
  
  const issues: any[] = []

  if (!result) return issues.slice(0, 4)

  if (result.lufs < -12) {
    issues.push({
      text: "Low output level",
      level: "high",
      realImpact: 10,
      insight: `Your track is at ${result.lufs?.toFixed(1)} LUFS`
    })
  }

  if (result.dynamicRange > 14) {
    issues.push({
      text: "Too much dynamic range",
      level: "medium",
      realImpact: 6,
      insight: `Dynamic range is ${result.dynamicRange?.toFixed(1)}`
    })
  }

  if (result.stereoWidth < 0.2) {
    issues.push({
      text: "Stereo too narrow",
      level: "medium",
      realImpact: 6,
      insight: `${Math.round(result.stereoWidth * 100)}% width`
    })
  }

  if (result.bassWeight < 0.4) {
    issues.push({
      text: "Weak low-end",
      level: "low",
      realImpact: 4,
      insight: `${Math.round(result.bassWeight * 100)}% bass`
    })
  }

  if (result.brightness < 0.3) {
    issues.push({
      text: "Lacks brightness",
      level: "low",
      realImpact: 3,
      insight: `${Math.round(result.brightness * 100)}% highs`
    })
  }

  return issues
}

export default function AnalyzePage() {
  const router = useRouter()
  const { seedAnalyzeIntoMasterFlow } = useMasterSession()

  const [showWaitlist, setShowWaitlist] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [processing, setProcessing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [waitlistError, setWaitlistError] = useState("")
  const issues = generateIssues(result).sort((a: any, b: any) => {
  const order: any = { high: 0, medium: 1, low: 2 }
  return order[a.level] - order[b.level]
})
  const high = issues.filter(i => i.level === "high")
  const medium = issues.filter(i => i.level === "medium")
  const low = issues.filter(i => i.level === "low")

  const displayIssues = issues

  const issueListForUi =
    result && Array.isArray(result.issues) && result.issues.length > 0
      ? [...result.issues].sort((a: any, b: any) => {
          const o: Record<string, number> = { high: 0, medium: 1, low: 2 }
          return (o[a.level as string] ?? 2) - (o[b.level as string] ?? 2)
        })
      : displayIssues

  const mainIssueRowIndex = issueListForUi.findIndex((x: any) => x.level === "high")
  const recommendations = generateFixes(result)
  const verdict = result?.verdict
  const handleWaitlist = async () => {
  setWaitlistError("")

  if (!waitlistEmail.includes("@")) {
    return setWaitlistError("Enter valid email")
  }

  setWaitlistLoading(true)

  // 🔥 fake delay (känns mer "äkta")
  await new Promise(res => setTimeout(res, 600 + Math.random() * 400))

  const { error } = await supabase
    .from("waitlist")
    .insert([{ email: waitlistEmail }])

  setWaitlistLoading(false)

  if (error) {
    if (error.message.includes("duplicate")) {
      setWaitlistError("Already joined 😉")
    } else {
      setWaitlistError("Something went wrong")
    }
    return
  }

  // ✅ SUCCESS
  setWaitlistSuccess(true)
  setWaitlistEmail("")

  // 🔥 låt user se success (viktigt!)
  setTimeout(() => {
    setShowWaitlist(false)
    setWaitlistSuccess(false)
  }, 5000)
}

  const canMaster = result?.mixQuality > 70
  const reduce = useReducedMotion()

  const handleUpload = async (uploadFile?: File) => {
    const f = uploadFile ?? file
    if (!f) return
    if (uploadFile) setFile(uploadFile)

    if (!isAcceptedAudioUpload(f)) {
      alert(AUDIO_UPLOAD_REJECT_MESSAGE)
      return
    }

    setProcessing(true)
    setAnalysisStep(0)
    setResult(null)

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const formData = new FormData()
    formData.append("file", f)
    formData.append("mode", "mix")

    let apiData: Record<string, unknown> | null = null
    let apiError: unknown = null

    const uploadUrl = publicBackendUrl("/upload")
    const apiPromise = axios
      .post(uploadUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        apiData = res.data
      })
      .catch((err) => {
        apiError = err
      })

    try {
      for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
        setAnalysisStep(i)
        await sleep(ANALYSIS_STEP_DELAYS_MS[i] ?? 850)
      }

      await apiPromise

      if (apiError) {
        throw apiError
      }

      setAnalysisStep(ANALYSIS_STEPS.length - 1)
      await sleep(520)

      const data = apiData as Record<string, unknown>
      setResult(data)
      appendHistory({
        kind: "analysis",
        name: f.name || "Audio",
        mixQuality: typeof data.mixQuality === "number" ? data.mixQuality : undefined,
        lufs: typeof data.lufs === "number" ? data.lufs : undefined,
      })
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Upload failed"
      console.error("UPLOAD ERROR:", err)
      alert(message.includes("Network") ? "Analysis failed — check your connection." : "Analysis failed. Please try again.")
    } finally {
      setProcessing(false)
      setAnalysisStep(0)
    }
  }



  return (
    <motion.div
      className="relative min-h-screen text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <CinematicBackground intensity="strong" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`relative mx-auto w-full px-5 pb-12 pt-6 md:px-10 md:pb-16 md:pt-8 ${
          result && !processing ? "max-w-6xl md:max-w-7xl" : "max-w-[1080px]"
        }`}
      >
        <AnimatePresence mode="wait">
          {!result && !processing && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.4 }}
            >
              <AnalyzeUploadHero
                phase="upload"
                file={file}
                fileInputRef={fileInputRef}
                onFileInputChange={(selected) => void handleUpload(selected)}
                onScanClick={() => void handleUpload()}
              />
            </motion.div>
          )}

          {processing && (
            <AnalyzeProcessingView
              key="processing"
              activeStep={analysisStep}
              file={file}
              fileName={file?.name}
            />
          )}

          {result && !processing && (
        <motion.div
          key="results"
          initial={{ opacity: 0, filter: "blur(10px)", y: 16 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-2 w-full space-y-4 pb-4 md:space-y-5 md:pb-5"
        >
          <AnalyzeStepRail phase="results" className="mx-auto" />

          <div className="relative flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setProcessing(false)
                setAnalysisStep(0)
              }}
              className="z-10 shrink-0 text-left text-[11px] font-medium text-white/68 transition hover:text-white/88 md:text-xs"
            >
              ← Back to upload
            </button>
            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-0.5 text-[8px] font-semibold uppercase tracking-[0.24em] text-violet-200/65">
              Analysis complete
            </span>
            <span className="w-14 shrink-0 sm:w-20" aria-hidden />
          </div>

          <header className="text-center">
            <h1 className="text-[1.45rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[1.6rem] md:text-[1.75rem]">
              Your mix,{" "}
              <span className="bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
                understood
              </span>
            </h1>
          </header>

          {/* Hero analysis card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-black/[0.55] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_56px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:rounded-[1.25rem] md:p-6"
          >
            <div className="flex flex-col items-stretch gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
              <motion.div
                className="order-first flex shrink-0 justify-center py-1 md:order-last md:py-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.75, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ScoreRing
                  value={result.mixQuality != null ? result.mixQuality : 0}
                  size={188}
                  variant="percent"
                  prominent
                />
              </motion.div>

              <div className="order-last min-w-0 flex-1 text-center md:order-first md:max-w-xl md:text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/64">Release readiness</p>
                <h2 className="mt-1.5 text-xl font-bold leading-tight tracking-tight text-white md:text-2xl lg:text-[1.65rem]">
                  {readinessHeadline(result.mixQuality)}
                </h2>

                <div className="mx-auto mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/[0.07] md:mx-0">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-500 shadow-[0_0_12px_rgba(244,114,182,0.15)]"
                    style={{ width: `${Math.min(100, Math.max(0, result.mixQuality ?? 0))}%` }}
                  />
                </div>

                <p className="mx-auto mt-2.5 max-w-md text-[12px] leading-relaxed text-white/74 md:mx-0 md:text-[13px]">
                  {readinessSubcopy(result.mixQuality, verdict)}
                </p>

                <ul className="mx-auto mt-3 max-w-md space-y-2 text-left md:mx-0">
                  {heroInsightBullets(result).map((item) => (
                    <li key={item.text} className="flex gap-2.5">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-300/45" aria-hidden />
                      <span className="text-[11px] leading-relaxed text-white/72 sm:text-[12px]">{item.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2.5 md:mx-0 md:justify-start">
                  <button
                    type="button"
                    onClick={async () => {
                      const pct = result.mixQuality != null ? Math.round(result.mixQuality) : 0
                      const shareText = `My mix scored ${pct}% on Mastrify`
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: "Mastrify", text: shareText, url: window.location.href })
                        } else {
                          await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
                        }
                      } catch {
                        /* user cancelled or clipboard blocked */
                      }
                    }}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold text-white/88 transition hover:border-white/[0.16] hover:bg-white/[0.07] md:text-xs"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold text-white/88 transition hover:border-white/[0.16] hover:bg-white/[0.07] md:text-xs"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Metrics */}
          <section aria-labelledby="mix-metrics-heading">
            <h3 id="mix-metrics-heading" className="sr-only">
              Mix metrics
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
              {(() => {
                const brightness = typeof result.brightness === "number" ? result.brightness : 0
                const tiles = [
                  { label: "Loudness", ...lufsPresentation(result.lufs) },
                  { label: "Dynamics", ...dynamicRangePresentation(result.dynamicRange) },
                  { label: "Stereo width", ...stereoWidthPresentation(result.stereoWidth) },
                  { label: "Low end", ...lowEndPresentation(result.bassWeight) },
                  { label: "Brightness", ...brightnessPresentation(result.brightness) },
                  { label: "Energy", ...energyPresentation(result.energy) },
                  { label: "Clarity", ...clarityPresentation(result) },
                  { label: "Highs", ...highsPresentation(brightness) },
                ]
                return tiles.map((tile) => (
                  <MetricInsightTile
                    key={tile.label}
                    label={tile.label}
                    vibe={tile.vibe}
                    feel={tile.feel}
                    technical={tile.technical}
                  />
                ))
              })()}
            </div>
          </section>

          {/* No issues — compact status */}
          {(result.issues?.length || 0) === 0 && (
            <div className="rounded-lg border border-emerald-500/12 bg-emerald-950/[0.1] px-3.5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:text-left">
              <p className="text-[13px] font-medium text-emerald-300/95">Production-ready — no critical issues flagged</p>
              <p className="mx-auto mt-1 max-w-xl text-[11px] leading-snug text-white/68 md:mx-0">
                Estimated post-master loudness <span className="font-semibold text-emerald-300/85">~−9 LUFS</span>
                <span className="text-white/60"> · </span>
                Streaming target typically −8 to −10 LUFS
              </p>
            </div>
          )}

          {/* Primary CTA — high in the scroll, dashboard strip */}
          <div className="flex flex-col gap-2 rounded-lg border border-purple-500/16 bg-gradient-to-r from-purple-950/30 via-black/50 to-slate-950/35 px-3.5 py-3 shadow-[0_0_20px_rgba(88,28,135,0.05),0_16px_40px_rgba(0,0,0,0.4)] md:flex-row md:items-center md:justify-between md:gap-4 md:px-4 md:py-2.5">
            <div className="min-w-0 text-center md:text-left">
              <h3 className="text-[15px] font-semibold tracking-tight text-white md:text-base">Ready for a pro master?</h3>
              <p className="mt-0.5 text-[11px] leading-snug text-white/70 line-clamp-2 md:line-clamp-1">
                Let AI tighten loudness, clarity, and punch — same engine as full Master.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (file && result) {
                    seedAnalyzeIntoMasterFlow(file, result as Record<string, unknown>)
                    router.push("/master/settings")
                  } else {
                    router.push("/master")
                  }
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-[#6d28d9] via-[#4f46e5] to-[#2563eb] px-6 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.2),0_10px_28px_rgba(0,0,0,0.38)] ring-1 ring-white/10 transition hover:brightness-110"
              >
                Master my track
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/flow"
                }}
                disabled={!canMaster}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border px-5 text-[13px] font-semibold transition ${
                  canMaster
                    ? "border-white/[0.12] bg-white/[0.04] text-white/88 hover:border-cyan-400/22 hover:bg-white/[0.07]"
                    : "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-white/64"
                }`}
              >
                One-page master
              </button>
            </div>
          </div>
          <p className="-mt-0.5 text-center text-[10px] leading-tight text-white/60 md:text-left">
            {canMaster
              ? "Choose workflow — identical processing core."
              : "Fix critical mix issues first for the strongest master."}
          </p>

          {/* Diagnostics — issues */}
          {(result.issues?.length || 0) > 0 && issueListForUi.length > 0 && (
            <section className="rounded-xl border border-white/[0.09] bg-black/[0.48] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl md:px-4 md:py-4">
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/68">Issues found</h3>
                <span className="text-[10px] tabular-nums text-white/58">{issueListForUi.length} signals</span>
              </div>
              <ul className="mt-0 divide-y divide-white/[0.05]">
                {issueListForUi.map((issue: any, i: number) => {
                  const current = Math.round(result.mixQuality)
                  const next = Math.min(99, Math.round(current + (issue.realImpact || 0)))
                  const actualGain = next - current
                  const isMain = mainIssueRowIndex !== -1 && i === mainIssueRowIndex
                  const rec = recommendations.find((r: any) => r.title === issue.text)
                  const presented = presentIssue(issue, result, rec?.steps?.[0] as string | undefined)

                  const dotClass =
                    issue.level === "high"
                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.18)] ring-1 ring-rose-400/32"
                      : issue.level === "medium"
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.14)] ring-1 ring-amber-300/28"
                        : "bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.12)] ring-1 ring-emerald-400/22"

                  return (
                    <li key={`${issue.text}-${i}`} className="flex gap-2.5 py-2 md:gap-3">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          {isMain ? (
                            <span className="rounded border border-rose-500/30 bg-rose-500/[0.07] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-rose-200/92">
                              Main issue
                            </span>
                          ) : null}
                          <p className="text-[13px] font-semibold leading-snug text-white md:text-[14px]">{presented.title}</p>
                          {isMain && issue.realImpact !== undefined ? (
                            <span className="text-[10px] tabular-nums text-amber-200/75">+{Math.max(1, actualGain)}%</span>
                          ) : null}
                        </div>
                        {presented.insight ? (
                          <p className="mt-1 text-[11px] leading-snug text-white/66 line-clamp-2">{presented.insight}</p>
                        ) : null}
                        {presented.tip ? (
                          <p className="mt-1 text-[10px] leading-snug text-white/55">{presented.tip}</p>
                        ) : null}
                        {isMain && issue.realImpact !== undefined ? (
                          <p className="mt-0.5 text-[10px] tabular-nums text-white/60">
                            Readiness {current}% → {next}%
                          </p>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {recommendations?.length > issues.length && recommendations[recommendations.length - 1]?.steps?.[0] ? (
                <div className="mt-1.5 border-t border-white/[0.06] pt-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-purple-200/50">Pro enhancement</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/66">{recommendations[recommendations.length - 1].steps[0]}</p>
                </div>
              ) : null}
            </section>
          )}
        </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

{/* 🔥 WAITLIST POPUP */}
{showWaitlist && (
  <div
  className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-all duration-300 ${
  waitlistSuccess ? "opacity-0 scale-95" : "opacity-100 scale-100"
}`}
  onClick={() => setShowWaitlist(false)}
>
    
    <div
  onClick={(e) => e.stopPropagation()}
  className="bg-[#0f172a] p-6 rounded-2xl w-[90%] max-w-md text-center border border-white/10"
>
      
      <h2 className="text-xl font-semibold mb-2">
        🚀 Join early access
      </h2>

      <p className="text-gray-400 text-sm mb-4">
        Be first to try AI mastering
      </p>

      <input
  value={waitlistEmail}
  onChange={(e) => setWaitlistEmail(e.target.value)}
  placeholder="Enter your email"
  className="w-full p-3 rounded-lg bg-black border border-gray-700 mb-3 outline-none"
/>

      <button
  onClick={handleWaitlist}
  disabled={waitlistLoading}
  className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 font-semibold disabled:opacity-50"
>
  {waitlistLoading ? "Joining..." : "Join waitlist"}
</button>

{waitlistSuccess && (
  <p className="text-green-400 text-sm mt-2">
    You're in! 🚀
  </p>
)}

      <button
        onClick={() => setShowWaitlist(false)}
        className="text-gray-500 text-sm mt-3"
      >
        Close
      </button>

    </div>

  </div>
)}

    </motion.div>
  )
}
