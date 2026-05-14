"use client"

import { supabase } from "../../lib/supabase"
import { useState, useRef } from "react"
import axios from "axios"
import { motion } from "framer-motion"
import Link from "next/link"
import BrandLogo from "../components/BrandLogo"
import CinematicBackground from "../components/CinematicBackground"
import { appendHistory } from "../../lib/history"

// 🔥 STAT COMPONENT (fixar alla 0 / "-" buggar)
function Stat({ label, value, percent = false }: any) {
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
    <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1.5 text-lg font-semibold tabular-nums text-white/95">{display}</div>
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
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-16 md:pt-24">
        <BrandLogo subtitle="ANALYSIS" />
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 max-w-2xl text-center text-4xl font-extrabold leading-[1.1] tracking-tight text-transparent md:text-6xl bg-gradient-to-r from-white via-purple-200 to-cyan-200/90 bg-clip-text"
        >
          Your mix analysis
        </motion.h1>
        <p className="mt-5 max-w-lg text-center text-sm leading-relaxed text-white/50 md:text-base">
          Free AI read on loudness, dynamics, stereo, and balance — know what to fix before you master.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/35">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">1 · Upload</span>
          <span className="text-white/20">→</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">2 · Scan</span>
          <span className="text-white/20">→</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">3 · Results</span>
        </div>

      {!result && (
        <div className="mt-14 w-full max-w-lg">
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
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
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
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
            <div className="relative flex flex-col items-center gap-5 text-center">
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 px-6 py-10">
                <p className="text-sm font-medium text-white/80">Drop your track</p>
                <p className="mt-2 text-xs text-white/40">100% free · No signup · Private in your browser session</p>
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
                className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 py-4 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(0,0,0,0.45)] transition hover:brightness-110"
              >
                {file ? "Scan my track" : "Choose track"}
              </button>
              {file && <p className="truncate text-xs text-cyan-300/80">{file.name}</p>}
            </div>
          </motion.div>
        </div>
      )}

      {loading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 text-center font-mono text-sm text-purple-200/90"
        >
          {loadingStep || "Analyzing your mix…"}
        </motion.p>
      )}

      {/* RESULT */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-14 w-full max-w-3xl space-y-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl md:p-10"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="md:max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Release readiness</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Your mix is{" "}
                <span className="text-transparent bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text">
                  {result.mixQuality != null ? Math.round(result.mixQuality) : 0}%
                </span>{" "}
                ready
              </h2>
              {verdict && <p className="mt-3 text-sm text-emerald-400/90">{verdict}</p>}
              <div className="mt-5 space-y-1.5 text-xs text-white/45">
                <div>
                  • Stereo width {result.stereoWidth > 0.25 ? "good" : "needs improvement"} (
                  {Math.round(result.stereoWidth * 100)}%)
                </div>
                <div>• Dynamic range is healthy ({Math.round(result.dynamicRange)})</div>
                <div>• Frequency balance is stable</div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-10 py-8 md:px-12">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Score</p>
              <p className="mt-2 text-5xl font-bold tabular-nums text-transparent bg-gradient-to-b from-white to-purple-300/80 bg-clip-text">
                {result.mixQuality != null ? Math.round(result.mixQuality) : 0}
              </p>
              <p className="mt-1 text-xs text-white/35">/ 100</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Spectrum</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="LUFS" value={result.lufs} />
              <Stat label="Dynamic Range" value={result.dynamicRange} />
              <Stat label="Stereo Width" value={result.stereoWidth} percent />
              <Stat label="Low End" value={result.bassWeight} percent />
              <Stat label="Brightness" value={result.brightness} percent />
              <Stat label="Energy" value={result.energy} />
            </div>
          </div>

          <p className="text-sm text-white/50">
            {issues.length > 0
              ? `AI found ${displayIssues.length} improvements in your mix`
              : "AI verdict: your mix is production-ready"}
          </p>

          {issues.length > 0 && (
            <p className="text-xs font-medium uppercase tracking-wider text-white/35">Opportunities</p>
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
    <h3 className="font-semibold mb-2">Issues</h3>

    {displayIssues.map((issue: any, i: number) => {
  const isLocked = false

  

  const current = Math.round(result.mixQuality)
  const next = Math.min(99, Math.round(current + (issue.realImpact || 0)))
  const actualGain = next - current

  return (
    <div
  key={i}
  className={`flex items-start gap-3 mb-3 p-3 rounded-lg relative ${
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


          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/flow"
              }}
              disabled={!canMaster}
              className={`flex-1 rounded-xl py-4 text-sm font-bold transition md:text-base ${
                canMaster
                  ? "bg-gradient-to-r from-emerald-400 to-cyan-500 text-black shadow-[0_12px_40px_rgba(52,211,153,0.25)] hover:brightness-110"
                  : "cursor-not-allowed bg-white/10 text-white/40"
              }`}
            >
              Master (quick flow)
            </button>
            <Link
              href="/master"
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] py-4 text-center text-sm font-semibold text-white/90 transition hover:border-cyan-400/30 hover:bg-white/[0.07] md:text-base"
            >
              AI mastering wizard
            </Link>
          </div>

          <p className="mt-3 text-center text-xs text-white/40">
            {canMaster
              ? "Ready for mastering — pick quick one-page or guided wizard."
              : "This mix still has issues affecting the final result"}
          </p>

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