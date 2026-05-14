"use client"

import { supabase } from "../../lib/supabase"
import { useState, useRef } from "react"
import axios from "axios"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import CinematicBackground from "../components/CinematicBackground"
import ScoreRing from "../components/ScoreRing"
import { appendHistory } from "../../lib/history"
import { publicBackendUrl } from "../../lib/publicBackendUrl"
import { useMasterSession } from "../master/MasterSessionProvider"

/** Small metric cell — real values only; `hint` is derived copy, not fake data */
function MetricTile({
  label,
  value,
  hint,
  hintClassName,
}: {
  label: string
  value: string
  hint?: string
  hintClassName?: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/[0.38] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md md:rounded-2xl md:px-5 md:py-4">
      <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/38">{label}</div>
      <div className="mt-1.5 text-lg font-bold tabular-nums tracking-tight text-white md:text-xl">{value}</div>
      {hint ? (
        <div className={`mt-1.5 text-[10px] font-medium leading-snug text-white/42 md:text-[11px] ${hintClassName ?? ""}`}>{hint}</div>
      ) : null}
    </div>
  )
}

function formatMetricValue(value: unknown, percent?: boolean): string {
  if (typeof value === "number") {
    if (percent) return `${(value * 100).toFixed(0)}%`
    return Number.isInteger(value) ? `${value}` : value.toFixed(1)
  }
  if (typeof value === "string" && value.length > 0) return value
  return "—"
}

function formatEnergyLabel(energy: unknown): string {
  if (typeof energy === "string") {
    const s = energy.toLowerCase()
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  if (typeof energy === "number") return energy.toFixed(2)
  return "—"
}

function energyHint(energy: unknown): string {
  if (typeof energy === "string") {
    const e = energy.toLowerCase()
    if (e === "low") return "Needs more"
    if (e === "high") return "Strong"
    if (e === "medium") return "Balanced"
  }
  if (typeof energy === "number") return "Level"
  return "—"
}

function highsHint(brightness: number): string {
  if (brightness < 0.28) return "Slightly low"
  if (brightness < 0.48) return "Balanced"
  return "Bright"
}

function clarityFromMix(result: any): { value: string; hint: string } {
  const b = typeof result?.brightness === "number" ? result.brightness : 0
  const s = typeof result?.stereoWidth === "number" ? result.stereoWidth : 0
  const blend = b * 0.55 + s * 0.45
  if (blend < 0.22) return { value: "Low", hint: "Needs more definition & air" }
  if (blend < 0.42) return { value: "Medium", hint: "Okay" }
  return { value: "High", hint: "Strong presence" }
}

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
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loadingStep, setLoadingStep] = useState<string | null>(null)
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

  const handleUpload = async () => {
  if (!file) return

  if (!file.type.startsWith("audio")) {
    alert("Please upload an audio file (.wav, .mp3, .m4a)")
    return
  }

  
  
  

  setLoading(true)

  const formData = new FormData()
  // Backend expects multer field name: "file"
  formData.append("file", file)
  formData.append("mode", "mix")

  try {

    const uploadUrl = publicBackendUrl("/upload")

    const res = await axios.post(uploadUrl, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    let steps = [
      "Analyzing your mix...",
      "Checking low end...",
      "Analyzing stereo width...",
      "Scanning dynamics..."
    ]

    setLoadingStep(steps[0])
    let i = 1

    const interval = setInterval(() => {
      setLoadingStep(steps[i])
      i++
      if (i >= steps.length) clearInterval(interval)
    }, 1000)

    setTimeout(() => {
      setLoadingStep("Finalizing analysis...")
    }, 3200)

    setTimeout(() => {
      setResult(res.data)
      appendHistory({
        kind: "analysis",
        name: file?.name || "Audio",
        mixQuality: typeof res.data.mixQuality === "number" ? res.data.mixQuality : undefined,
        lufs: typeof res.data.lufs === "number" ? res.data.lufs : undefined,
      })
      setLoading(false)
      setLoadingStep("")
    }, 4200)

  } catch (err: any) {

    console.error("UPLOAD ERROR:", err?.response?.data || err.message)

    setLoading(false)
  }
}



  return (
    <div className="relative text-white">
      <CinematicBackground />
      <div
        className={`relative mx-auto flex w-full flex-col items-center px-5 pb-10 pt-4 sm:px-5 md:pb-12 md:pt-5 ${
          result ? "max-w-6xl md:max-w-7xl md:px-8" : "max-w-[520px] md:max-w-[568px]"
        }`}
      >
        {!result && (
          <div className="relative w-full">
            {/* Ambient glow — full hero column (softer, less cyan wash) */}
            <div
              className="pointer-events-none absolute left-1/2 top-[2%] z-0 h-[min(52vh,520px)] w-[min(92vw,30rem)] -translate-x-1/2 rounded-[3rem] bg-[radial-gradient(ellipse_58%_44%_at_50%_20%,rgba(109,40,217,0.055),rgba(217,70,239,0.018)_48%,transparent_68%)] blur-2xl"
              aria-hidden
            />

            <div className="relative z-10 flex w-full flex-col items-center">
            <span className="rounded-full border border-purple-500/40 bg-purple-500/[0.07] px-3.5 py-1 text-[9px] font-bold uppercase tracking-[0.26em] text-purple-200/95 shadow-[0_0_12px_rgba(139,92,246,0.12)]">
              Free analysis
            </span>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 w-full text-center text-[2rem] font-extrabold leading-[1.06] tracking-tight sm:text-[2.15rem] md:text-[2.45rem]"
            >
              <span className="text-white">Your mix </span>
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">analysis</span>
            </motion.h1>
            <p className="mt-3 w-full max-w-[28rem] text-center text-[13px] leading-snug text-white/32 sm:text-[14px] md:mt-3.5">
              AI shows exactly what&apos;s holding your track back — before you release it.
            </p>

            {/* Step indicator — thin connectors */}
            <div className="mx-auto mt-8 flex w-full max-w-[min(100%,380px)] items-center justify-center md:mt-9 md:max-w-[400px]">
              {(["Upload", "Analyze", "Results"] as const).map((label, i) => (
                <div key={label} className="contents">
                  {i > 0 ? (
                    <div
                      className="mx-0.5 h-[0.5px] min-w-[1.25rem] flex-1 max-w-[3.25rem] bg-gradient-to-r from-transparent via-white/14 to-transparent sm:mx-1 sm:max-w-[4rem]"
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex w-[4rem] shrink-0 flex-col items-center sm:w-[4.25rem]">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold leading-none sm:h-[2.125rem] sm:w-[2.125rem] sm:text-xs ${
                        i === 0
                          ? "bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.32)] ring-1 ring-purple-400/40"
                          : "border border-white/[0.1] bg-black/55 text-white/30"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`mt-1.5 text-center text-[8px] font-semibold uppercase tracking-[0.2em] sm:text-[9px] ${
                        i === 0 ? "text-purple-300/95" : "text-white/34"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

        <div className="mt-8 w-full md:mt-9">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="audio/*,video/*"
            capture
            onChange={(e) => {
              const selectedFile = e.target.files?.[0]
              if (selectedFile) {
                setFile(selectedFile)
                handleUpload()
              }
            }}
          />

          <div className="relative w-full overflow-visible pb-4 md:pb-6">
            {/* Radial glow behind card — aligned with master upload depth */}
            <div
              className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[min(320px,68vw)] w-[min(460px,92%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_42%_36%_at_50%_50%,rgba(147,51,234,0.14),rgba(192,38,211,0.045)_52%,transparent_64%)] blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[min(180px,48vw)] w-[min(340px,85%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(34,211,238,0.06),transparent_55%)] blur-3xl"
              aria-hidden
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 mx-auto w-full max-w-[min(100%,29.5rem)] origin-top scale-[1.17] overflow-hidden rounded-[1.45rem] border border-white/[0.18] bg-gradient-to-b from-black/[0.52] to-black/[0.94] p-8 shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_0_24px_rgba(88,28,135,0.12),0_0_56px_rgba(88,28,135,0.1),0_28px_64px_rgba(0,0,0,0.68)] ring-1 ring-fuchsia-500/12 backdrop-blur-2xl sm:p-9 md:scale-[1.2] md:p-10"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f && f.type.startsWith("audio")) {
                  setFile(f)
                  handleUpload()
                }
              }}
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-purple-600/10 blur-2xl" />

              <div className="relative flex w-full flex-col items-center text-center">
                <div className="mx-1 w-full rounded-[1.1rem] border border-dashed border-white/[0.11] bg-black/[0.64] px-8 py-12 sm:mx-1.5 sm:px-10 sm:py-14 md:px-11 md:py-16">
                  <div className="mx-auto mb-4 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/40 to-purple-900/25 ring-1 ring-white/[0.12] shadow-[0_0_12px_rgba(168,85,247,0.14)]">
                    <svg className="h-10 w-10 drop-shadow-[0_0_4px_rgba(216,180,254,0.28)]" viewBox="0 0 24 24" aria-hidden>
                      <defs>
                        <linearGradient id="analyzeUploadIcon" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#e9d5ff" />
                          <stop offset="50%" stopColor="#c4b5fd" />
                          <stop offset="100%" stopColor="#a5b4fc" />
                        </linearGradient>
                      </defs>
                      <path
                        fill="none"
                        stroke="url(#analyzeUploadIcon)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-[1.14rem] font-semibold tracking-tight text-white sm:text-[1.22rem] md:text-[1.3rem]">Drop your track here</p>
                  <p className="mx-auto mt-3.5 max-w-[19rem] text-[12px] leading-relaxed text-white/28 sm:text-[13px]">
                    WAV, AIFF, FLAC, MP3 up to 500MB
                  </p>
                </div>

                <div className="mt-7 flex w-full max-w-[min(100%,22rem)] flex-col items-center gap-3.5 sm:mt-8 md:mt-9">
                  <button
                    type="button"
                    onClick={() => {
                      if (!file) {
                        fileInputRef.current?.click()
                      } else {
                        handleUpload()
                      }
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4338ca] to-[#0e7490] px-8 py-3.5 text-[14px] font-semibold text-white shadow-[0_0_22px_rgba(91,33,182,0.28),0_0_14px_rgba(14,116,144,0.14),inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition hover:brightness-110 sm:py-4 sm:text-[16px]"
                  >
                    {file ? "Scan my track" : "Choose file"}
                  </button>
                  <p className="text-[11px] text-white/24">or drag and drop</p>
                  {file && <p className="max-w-full truncate px-2 text-xs text-cyan-300/85">{file.name}</p>}
                  {loading && (
                    <p className="font-mono text-[11px] text-purple-200/90 sm:text-xs">{loadingStep || "Analyzing your mix…"}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature cards — clear separation from upload card */}
          <div className="mx-auto mt-12 grid w-full max-w-[min(100%,26rem)] grid-cols-1 gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-3 md:mt-16 md:max-w-[min(100%,28rem)] md:gap-3">
            {[
              {
                title: "100% free",
                sub: "No credit card",
                icon: (
                  <svg className="h-5 w-5 text-purple-300/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "Private & secure",
                sub: "Your files are safe",
                icon: (
                  <svg className="h-5 w-5 text-cyan-300/85" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: "Instant results",
                sub: "Takes ~30 seconds",
                icon: (
                  <svg className="h-5 w-5 text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-white/[0.06] bg-black/[0.5] px-2.5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md sm:min-h-[4.75rem] sm:py-3"
              >
                <div className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/[0.05] sm:h-8 sm:w-8">
                  {card.icon}
                </div>
                <p className="text-[11px] font-semibold leading-tight text-white/90 sm:text-[11.5px]">{card.title}</p>
                <p className="max-w-[9rem] text-[9px] leading-snug text-white/26 sm:max-w-none sm:text-[9.5px]">{card.sub}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 w-full max-w-[min(100%,28rem)] text-center text-[11px] text-white/28 sm:mt-9 sm:text-xs">
            Need help?{" "}
            <Link href="/how-it-works" className="text-purple-300/80 underline-offset-2 transition hover:text-cyan-200/85 hover:underline">
              Supported formats &amp; tips
            </Link>
          </p>
        </div>
            </div>
          </div>
        )}


      {/* RESULT */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mt-6 w-full max-w-5xl space-y-12 pb-6 md:mt-8 md:space-y-16 lg:max-w-6xl"
        >
          <div className="w-full">
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setLoading(false)
                setLoadingStep(null)
              }}
              className="text-left text-[11px] font-medium text-white/38 transition hover:text-white/65 md:text-xs"
            >
              ← Back to upload
            </button>
          </div>

          <header className="flex flex-col items-center text-center">
            <span className="rounded-full border border-purple-500/35 bg-purple-500/[0.06] px-3.5 py-1 text-[9px] font-bold uppercase tracking-[0.26em] text-purple-200/90 shadow-[0_0_12px_rgba(139,92,246,0.1)]">
              Free analysis
            </span>
            <h1 className="mt-5 text-[1.85rem] font-bold leading-[1.08] tracking-tight text-white sm:text-[2.1rem] md:text-[2.35rem]">
              <span className="text-white">Your mix </span>
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">analysis</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-white/38 md:text-sm">
              AI shows exactly what&apos;s holding your track back — before you release it.
            </p>
          </header>

          {/* Hero analysis card */}
          <div className="rounded-[1.35rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-black/[0.55] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_72px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:rounded-3xl md:p-9 lg:p-10">
            <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="min-w-0 flex-1 text-center lg:max-w-xl lg:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Release readiness</p>
                <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl lg:text-[2.15rem]">
                  Your mix is{" "}
                  <span className="text-transparent bg-gradient-to-r from-fuchsia-300 via-white to-cyan-200 bg-clip-text">
                    {result.mixQuality != null ? Math.round(result.mixQuality) : 0}%
                  </span>{" "}
                  ready for release
                </h2>

                <div className="mx-auto mt-5 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/[0.07] lg:mx-0">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-500 shadow-[0_0_12px_rgba(244,114,182,0.15)]"
                    style={{ width: `${Math.min(100, Math.max(0, result.mixQuality ?? 0))}%` }}
                  />
                </div>

                {verdict ? (
                  <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-white/45 lg:mx-0">{verdict}</p>
                ) : (
                  <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-white/45 lg:mx-0">
                    {typeof result.mixQuality === "number" && result.mixQuality >= 75
                      ? "Mix is in good shape for mastering."
                      : "Mix needs improvement before release"}
                  </p>
                )}

                <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left text-[12px] leading-snug text-white/42 lg:mx-0 md:text-[13px]">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/25" aria-hidden />
                    <span>
                      Stereo width {result.stereoWidth > 0.25 ? "good" : "needs improvement"} (
                      {Math.round((result.stereoWidth ?? 0) * 100)}%)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/25" aria-hidden />
                    <span>
                      Dynamic range {typeof result.dynamicRange === "number" && result.dynamicRange > 14 ? "is high" : "looks healthy"} (
                      {typeof result.dynamicRange === "number" ? result.dynamicRange.toFixed(1) : "—"})
                    </span>
                  </li>
                  {typeof result.lufs === "number" && (
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/25" aria-hidden />
                      <span>Integrated loudness around {result.lufs.toFixed(1)} LUFS</span>
                    </li>
                  )}
                </ul>

                <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-3 lg:mx-0 lg:justify-start">
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
                    className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-[12px] font-semibold text-white/88 transition hover:border-white/[0.16] hover:bg-white/[0.07] md:text-sm"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-[12px] font-semibold text-white/88 transition hover:border-white/[0.16] hover:bg-white/[0.07] md:text-sm"
                  >
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="flex shrink-0 justify-center lg:pr-2">
                <ScoreRing value={result.mixQuality != null ? result.mixQuality : 0} size={200} variant="percent" />
              </div>
            </div>
          </div>

          {/* Metrics */}
          <section>
            <h3 className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/34 md:text-left">
              Mix metrics
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <MetricTile
                label="LUFS"
                value={formatMetricValue(result.lufs)}
                hint={typeof result.lufs === "number" && result.lufs < -12 ? "Too quiet" : "Level check"}
              />
              <MetricTile
                label="Dynamic range"
                value={formatMetricValue(result.dynamicRange)}
                hint={typeof result.dynamicRange === "number" && result.dynamicRange > 14 ? "High" : "Healthy"}
              />
              <MetricTile
                label="Stereo width"
                value={formatMetricValue(result.stereoWidth, true)}
                hint={(result.stereoWidth ?? 0) < 0.2 ? "Narrow" : "OK"}
              />
              <MetricTile
                label="Low end"
                value={formatMetricValue(result.bassWeight, true)}
                hint={(result.bassWeight ?? 0) > 0.55 ? "Too loud" : (result.bassWeight ?? 0) < 0.4 ? "Light" : "Balanced"}
              />
              <MetricTile
                label="Brightness"
                value={formatMetricValue(result.brightness, true)}
                hint={(result.brightness ?? 0) < 0.3 ? "Dark" : "Air"}
              />
              <MetricTile
                label="Energy"
                value={formatEnergyLabel(result.energy)}
                hint={energyHint(result.energy)}
                hintClassName={
                  typeof result.energy === "string" && result.energy.toLowerCase() === "low"
                    ? "text-sky-300/85"
                    : undefined
                }
              />
              <MetricTile label="Clarity" value={clarityFromMix(result).value} hint={clarityFromMix(result).hint} />
              <MetricTile
                label="Highs"
                value={formatMetricValue(result.brightness, true)}
                hint={highsHint(typeof result.brightness === "number" ? result.brightness : 0)}
              />
            </div>
          </section>

          <p className="text-center text-[13px] text-white/48 md:text-sm">
            {issues.length > 0
              ? `AI found ${displayIssues.length} improvements in your mix`
              : "AI verdict: your mix is production-ready"}
          </p>

          {/* No issues (API returned zero-length issues) */}
          {(result.issues?.length || 0) === 0 && (
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/[0.12] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:px-8">
              <p className="text-sm font-medium text-emerald-300/95">Ready for mastering — no critical issues detected</p>
              <p className="mx-auto mt-3 max-w-md text-[12px] leading-relaxed text-white/42">
                Estimated loudness after mastering:{" "}
                <span className="font-semibold text-emerald-300/90">-9 LUFS</span>
              </p>
              <p className="mt-2 text-[11px] text-white/32">Target for streaming platforms: -8 to -10 LUFS</p>
              <p className="mt-3 text-[11px] text-purple-300/75">AI insight → mastering will enhance loudness, clarity and punch</p>
            </div>
          )}

          {/* Issues found */}
          {(result.issues?.length || 0) > 0 && issueListForUi.length > 0 && (
            <section className="rounded-[1.25rem] border border-white/[0.07] bg-black/[0.35] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_56px_rgba(0,0,0,0.45)] backdrop-blur-xl md:px-8 md:py-8">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/36">Issues found</h3>
              <ul className="mt-6 space-y-0 divide-y divide-white/[0.06]">
                {issueListForUi.map((issue: any, i: number) => {
                  const current = Math.round(result.mixQuality)
                  const next = Math.min(99, Math.round(current + (issue.realImpact || 0)))
                  const actualGain = next - current
                  const gen = displayIssues.find((d: any) => d.text === issue.text)
                  const insight = issue.insight ?? gen?.insight
                  const isMain = mainIssueRowIndex !== -1 && i === mainIssueRowIndex

                  const dotClass =
                    issue.level === "high"
                      ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.22)] ring-1 ring-rose-400/35"
                      : issue.level === "medium"
                        ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.18)] ring-1 ring-amber-300/30"
                        : "bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.16)] ring-1 ring-emerald-400/25"

                  return (
                    <li key={`${issue.text}-${i}`} className="flex gap-4 py-5 first:pt-0 md:gap-5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        {isMain ? (
                          <span className="inline-block rounded border border-rose-500/35 bg-rose-500/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200/95">
                            Main issue
                          </span>
                        ) : null}
                        <p className={`mt-1 text-[14px] font-semibold leading-snug text-white md:text-[15px] ${isMain ? "text-white" : ""}`}>
                          {issue.text}
                        </p>
                        {insight ? <p className="mt-1.5 text-[12px] leading-relaxed text-white/38 md:text-[13px]">{insight}</p> : null}
                        {isMain && issue.realImpact !== undefined ? (
                          <div className="mt-3 space-y-1 text-[11px] md:text-xs">
                            <p className="text-amber-200/80">+{Math.max(1, actualGain)}% improvement if fixed</p>
                            <p className="text-emerald-300/85">
                              Your score: {current}% → {next}%
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Recommendations — same data as before */}
          <section className="rounded-[1.25rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-black/[0.45] px-5 py-6 backdrop-blur-xl md:px-8 md:py-8">
            {issues.length > 0 ? (
              <>
                <h3 className="text-sm font-semibold text-white/90">What affects your mix</h3>
                <div className="mt-5 space-y-6">
                  {issues.map((issue: any, i: number) => {
                    const rec = recommendations.find((r) => r.title === issue.text)
                    const isLocked = false
                    return (
                      <div key={i} className={isLocked ? "blur-[6px] opacity-40" : ""}>
                        <p className="font-semibold text-white">{issue.text}</p>
                        <p className="mt-1 text-[11px] text-white/38">
                          {issue.level === "high" && "High impact"}
                          {issue.level === "medium" && "Affects balance"}
                          {issue.level === "low" && "Subtle improvement"}
                        </p>
                        {rec?.steps?.map((step: string, j: number) => (
                          <p key={j} className="mt-2 pl-3 text-[13px] leading-relaxed text-purple-200/75 md:text-sm">
                            • {step}
                          </p>
                        ))}
                      </div>
                    )
                  })}
                </div>
                {recommendations?.length > issues.length && (
                  <div className="mt-8 border-t border-white/[0.06] pt-6">
                    <p className="text-sm font-semibold text-purple-200/85">Pro enhancement</p>
                    {recommendations[recommendations.length - 1]?.steps?.map((step: string, j: number) => (
                      <p key={j} className="mt-2 pl-3 text-[13px] leading-relaxed text-white/45 md:text-sm">
                        • {step}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </section>

          {/* CTA */}
          <div className="rounded-[1.35rem] border border-purple-500/18 bg-gradient-to-br from-purple-950/35 via-black/55 to-slate-950/40 px-6 py-9 text-center shadow-[0_0_28px_rgba(88,28,135,0.06),0_24px_56px_rgba(0,0,0,0.48)] md:px-10 md:py-11">
            <h3 className="text-xl font-semibold tracking-tight text-white md:text-2xl">Ready for a pro master?</h3>
            <p className="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-white/45 md:text-sm">
              Let AI fix these issues and make your track sound release-ready.
            </p>
            <div className="mx-auto mt-8 flex max-w-lg flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
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
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#4f46e5] to-[#2563eb] px-8 text-[14px] font-semibold text-white shadow-[0_0_22px_rgba(99,102,241,0.22),0_12px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition hover:brightness-110"
              >
                Master my track
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/flow"
                }}
                disabled={!canMaster}
                className={`inline-flex min-h-[48px] items-center justify-center rounded-xl border px-8 text-[14px] font-semibold transition md:text-[13px] ${
                  canMaster
                    ? "border-white/[0.14] bg-white/[0.05] text-white/90 hover:border-cyan-400/25 hover:bg-white/[0.08]"
                    : "cursor-not-allowed border-white/[0.06] bg-white/[0.03] text-white/35"
                }`}
              >
                One-page master
              </button>
            </div>
            <p className="mt-5 text-center text-[11px] text-white/38">
              {canMaster
                ? "Same engine — pick the experience you prefer."
                : "Address critical mix issues first for the best master."}
            </p>
          </div>
        </motion.div>
)}

      </div>

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

</div>
  )
}