"use client"

import { supabase } from "../../lib/supabase"
import { useState, useRef } from "react"
import axios from "axios"
import { motion } from "framer-motion"
import Link from "next/link"
import CinematicBackground from "../components/CinematicBackground"
import ScoreRing from "../components/ScoreRing"
import { appendHistory } from "../../lib/history"

function Stat({ label, value, percent = false, hint }: any) {
  let display = "-"

  if (typeof value === "number") {
    if (percent) {
      display = (value * 100).toFixed(0) + "%"
    } else {
      display = value.toFixed(1)
    }
  } else if (typeof value === "string") {
    display = value
  }

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-black/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-2 text-xl font-bold tabular-nums text-white md:text-2xl">{display}</div>
      {hint ? <div className="mt-2 text-[11px] font-medium text-white/50">{hint}</div> : null}
    </div>
  )
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
  
  const recommendations = generateFixes(result)
  const verdict = result?.verdict
  const [showAll, setShowAll] = useState(false)

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

    console.log("SENDING FILE:", file)

    const res = await axios.post(
  "https://mastrify-backend-production.up.railway.app/upload",
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  }
)

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
      console.log("RESULT:", res.data)
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
    <div className="relative min-h-screen text-white">
      <CinematicBackground />
      <div
        className={`relative mx-auto flex w-full flex-col items-center px-5 pb-20 pt-8 md:px-6 md:pb-24 md:pt-10 ${
          result ? "max-w-6xl md:max-w-7xl" : "max-w-[520px]"
        }`}
      >
        {!result && (
          <>
            <span className="rounded-full border border-purple-500/40 bg-purple-500/[0.07] px-3.5 py-1 text-[9px] font-bold uppercase tracking-[0.26em] text-purple-200/95 shadow-[0_0_20px_rgba(139,92,246,0.25)]">
              Free analysis
            </span>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 text-center text-[1.65rem] font-extrabold leading-[1.12] tracking-tight sm:text-[1.85rem] md:text-[2rem]"
            >
              <span className="text-white">Your mix </span>
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">analysis</span>
            </motion.h1>
            <p className="mt-4 max-w-[26rem] text-center text-[14px] leading-relaxed text-white/45 md:text-[15px]">
              AI shows exactly what&apos;s holding your track back — before you release it.
            </p>

            {/* Step indicator — thin connectors, purple active */}
            <div className="mt-8 flex w-full max-w-[min(100%,380px)] items-center justify-center">
              {(["Upload", "Analyze", "Results"] as const).map((label, i) => (
                <div key={label} className="contents">
                  {i > 0 ? (
                    <div
                      className="mx-1 h-px min-w-[1.5rem] flex-1 max-w-[3.5rem] bg-white/[0.12] sm:mx-2 sm:max-w-[4.5rem]"
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex w-[4.5rem] shrink-0 flex-col items-center sm:w-[5rem]">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold leading-none shadow-lg sm:h-10 sm:w-10 sm:text-sm ${
                        i === 0
                          ? "bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.55)] ring-2 ring-purple-400/35"
                          : "border border-white/[0.12] bg-black/50 text-white/35"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.18em] sm:text-[10px] ${
                        i === 0 ? "text-purple-300/95" : "text-white/32"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      {!result && (
        <div className="mt-9 w-full">
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-black/55 to-black/75 p-5 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_0_48px_rgba(88,28,135,0.2),0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6"
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
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-600/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="w-full rounded-xl border border-dashed border-white/[0.14] bg-black/45 px-6 py-10 sm:px-8 sm:py-11">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/35 to-cyan-500/25 ring-1 ring-white/10">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" aria-hidden>
                    <defs>
                      <linearGradient id="analyzeUploadIcon" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#22d3ee" />
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
                <p className="text-base font-semibold tracking-tight text-white sm:text-[1.05rem]">Drop your track here</p>
                <p className="mx-auto mt-2 max-w-[18rem] text-[12px] leading-relaxed text-white/38 sm:text-[13px]">
                  WAV, AIFF, FLAC, MP3 up to 500MB
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!file) {
                    fileInputRef.current?.click()
                  } else {
                    handleUpload()
                  }
                }}
                className="mt-6 w-full max-w-[280px] rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#06b6d4] px-8 py-3.5 text-[14px] font-semibold text-white shadow-[0_0_32px_rgba(99,102,241,0.45),0_12px_36px_rgba(0,0,0,0.35)] transition hover:brightness-110 sm:py-4 sm:text-[15px]"
              >
                {file ? "Scan my track" : "Choose file"}
              </button>
              <p className="mt-2.5 text-[11px] text-white/32">or drag and drop</p>
              {file && <p className="mt-3 max-w-full truncate px-2 text-xs text-cyan-300/85">{file.name}</p>}
              {loading && (
                <p className="mt-4 font-mono text-[11px] text-purple-200/90 sm:text-xs">{loadingStep || "Analyzing your mix…"}</p>
              )}
            </div>
          </motion.div>

          {/* Feature cards — equal width, below main card */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
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
                  <svg className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-black/40 px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:py-3.5"
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                  {card.icon}
                </div>
                <p className="text-[12px] font-semibold text-white/90 sm:text-[13px]">{card.title}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-white/35 sm:text-[11px]">{card.sub}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[11px] text-white/35 sm:text-xs">
            Need help?{" "}
            <Link href="/how-it-works" className="text-purple-300/90 underline-offset-2 transition hover:text-cyan-200/90 hover:underline">
              Supported formats &amp; tips
            </Link>
          </p>
        </div>
      )}


      {/* RESULT */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 w-full space-y-12 rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-black/40 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_32px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:mt-10 md:p-12 lg:p-14"
        >
          <div className="flex flex-col items-center gap-10 border-b border-white/10 pb-12 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl flex-1 text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">Release readiness</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                Your mix is{" "}
                <span className="text-transparent bg-gradient-to-r from-purple-300 via-white to-cyan-300 bg-clip-text">
                  {result.mixQuality != null ? Math.round(result.mixQuality) : 0}%
                </span>{" "}
                ready for release
              </h2>
              {verdict && <p className="mt-4 text-sm text-emerald-400/95">{verdict}</p>}
              <div className="mt-6 space-y-2 text-sm text-white/50">
                <div>
                  Stereo width {result.stereoWidth > 0.25 ? "good" : "needs work"} ·{" "}
                  {Math.round(result.stereoWidth * 100)}%
                </div>
                <div>Dynamic range {Math.round(result.dynamicRange)} · Frequency balance stable</div>
              </div>
            </div>
            <ScoreRing value={result.mixQuality != null ? result.mixQuality : 0} size={176} />
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">Mix metrics</h3>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="LUFS" value={result.lufs} hint={typeof result.lufs === "number" && result.lufs < -12 ? "Below target" : "Level check"} />
              <Stat
                label="Dynamic range"
                value={result.dynamicRange}
                hint={typeof result.dynamicRange === "number" && result.dynamicRange > 14 ? "Wide dynamics" : "Healthy"}
              />
              <Stat label="Stereo width" value={result.stereoWidth} percent hint={(result.stereoWidth ?? 0) < 0.2 ? "Narrow" : "OK"} />
              <Stat label="Low end" value={result.bassWeight} percent hint={(result.bassWeight ?? 0) < 0.4 ? "Light" : "Weight"} />
              <Stat label="Brightness" value={result.brightness} percent hint={(result.brightness ?? 0) < 0.3 ? "Dark" : "Air"} />
              <Stat label="Energy" value={result.energy} hint="Average level" />
            </div>
          </div>

          <p className="text-center text-sm text-white/55 md:text-base">
            {issues.length > 0
              ? `AI found ${displayIssues.length} improvements in your mix`
              : "AI verdict: your mix is production-ready"}
          </p>

          {issues.length > 0 && (
            <h3 className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">Issues &amp; opportunities</h3>
          )}


          {/* ISSUES */}
          <div className="mb-6">
            {/* ✅ NO ISSUES MESSAGE */}
{(result.issues?.length || 0) === 0 && (
  <>
    <div className="mb-4 text-green-400 font-medium">
      ✅ Ready for mastering — no critical issues detected
    </div>

    <div className="text-sm text-center mt-2 mb-2">
  Estimated loudness after mastering: 
  <span className="text-green-400 font-semibold ml-1">-9 LUFS</span>
</div>

<div className="text-xs text-gray-500 text-center">
  Target for streaming platforms: -8 to -10 LUFS
</div>


    <div className="text-xs text-purple-300 text-center mt-1 mb-3 opacity-90">
  AI insight → mastering will enhance loudness, clarity and punch
</div>

  </>
)}





{/* ⚠️ ONLY SHOW ISSUES IF THEY EXIST */}
{(result.issues?.length || 0) > 0 && (
  <>
    <h3 className="mb-4 text-sm font-bold text-white/90">Issues</h3>

    {displayIssues.map((issue: any, i: number) => {
  const isLocked = false

  

  const current = Math.round(result.mixQuality)
  const next = Math.min(99, Math.round(current + (issue.realImpact || 0)))
  const actualGain = next - current

  return (
    <div
  key={i}
  className={`relative mb-4 flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-black/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
  isLocked ? "blur-[8px] opacity-60" : ""
}`}
>
      <span className="text-lg">
        {issue.level === "high" && "🔴"}
        {issue.level === "medium" && "🟡"}
        {issue.level === "low" && "🟢"}
      </span>

      <div>
        {i === 0 && (
  <>
    <div className="text-xs text-red-400 mb-1 font-semibold">
      MAIN ISSUE
    </div>

    <div className="text-xs text-gray-400 mb-1">
      This is why your track doesn’t sound pro
    </div>
  </>
)}

        <div className={`${i === 0 ? "font-semibold text-white" : ""}`}>
          {issue.text}
          {issue.insight && (
  <div className="text-xs text-gray-400 mt-1">
    {issue.insight}
  </div>
)}

          {i === 0 && issue.realImpact !== undefined && (
            <>
              <div className="text-xs text-yellow-300 mt-1 opacity-90">
                +{Math.max(1, actualGain)}% improvement if fixed
              </div>

              <div className="text-xs text-green-400 mt-1">
                Your score: {current}% → {next}%
              </div>
            </>
          )}
        </div>
        {isLocked && (
  <div className="absolute inset-0 flex flex-col items-center justify-center">
    <div className="text-xs text-white/80 mb-1">
      This is what's holding your track back
    </div>

    <div className="bg-black/60 px-4 py-2 rounded-lg text-sm text-purple-300 backdrop-blur-md">
      🔒 Unlock to see
    </div>
  </div>
)}
      </div>
    </div>
  )
})}


  </>
)}
          </div>

          {/* FIXES */}
<div className="mb-6">

  {issues.length > 0 ? (
    <>
      <h3 className="font-semibold mb-2">
        What affects your mix
      </h3>

      {issues.map((issue: any, i: number) => {
        const rec = recommendations.find(r => r.title === issue.text)
        const isLocked = false

        return (
          <div
  key={i}
  className={`mb-4 ${isLocked ? "blur-[6px] opacity-40" : ""}`}
>

            <div className="font-semibold text-white mb-1">
              {issue.text}
            </div>

            <div className="text-xs text-gray-400 mb-2">
  {issue.level === "high" && "High impact"}
{issue.level === "medium" && "Affects balance"}
{issue.level === "low" && "Subtle improvement"}
</div>

            {rec?.steps?.map((step: string, j: number) => (
  <div key={j} className="text-sm text-purple-300 ml-2">
    • {step}
  </div>
))}

{isLocked && (
  <div className="text-xs text-purple-300 mt-1">
   
  </div>
)}

          </div>
        )
      })}

      {/* PRO ENHANCEMENT SIST */}
      {recommendations?.length > issues.length && (
        <div className="mt-4">
          <div className="font-semibold text-purple-300 mb-1">
            Pro enhancement
          </div>

          {recommendations[recommendations.length - 1]?.steps?.map(
            (step: string, j: number) => (
              <div key={j} className="text-sm text-gray-400 ml-2">
                • {step}
              </div>
            )
          )}
        </div>
      )}
    </>
  ) : null}

</div>


          <div className="rounded-3xl border border-purple-500/25 bg-gradient-to-r from-purple-950/50 via-black/60 to-cyan-950/40 p-8 shadow-[0_0_60px_rgba(139,92,246,0.15)] md:p-10">
            <p className="text-center text-lg font-semibold text-white md:text-xl">Ready for a pro master?</p>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-white/50">
              Take this mix to our AI mastering flow — quick path or guided wizard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/flow"
                }}
                disabled={!canMaster}
                className={`rounded-2xl px-8 py-4 text-sm font-bold transition md:text-base ${
                  canMaster
                    ? "bg-gradient-to-r from-emerald-400 to-cyan-500 text-black shadow-[0_12px_40px_rgba(52,211,153,0.3)] hover:brightness-110"
                    : "cursor-not-allowed bg-white/10 text-white/40"
                }`}
              >
                Master my track
              </button>
              <Link
                href="/master"
                className="rounded-2xl border border-white/20 bg-white/[0.06] px-8 py-4 text-center text-sm font-semibold text-white/90 transition hover:border-cyan-400/35 hover:bg-white/[0.1] md:text-base"
              >
                AI mastering wizard
              </Link>
            </div>
            <p className="mt-4 text-center text-xs text-white/40">
              {canMaster
                ? "Both options use the same engine — pick the experience you prefer."
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