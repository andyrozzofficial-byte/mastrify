"use client"

import { supabase } from "../../lib/supabase"
import { useState, useRef } from "react"
import axios from "axios"
import { motion } from "framer-motion"

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
    <div className="bg-white/5 p-3 rounded-lg">
      <div className="text-gray-400">{label}</div>
      <div className="font-semibold">{display}</div>
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
        "Increase gain before limiter",
        "Use limiter to reach -8 to -10 LUFS",
        "Keep peaks below 0 dB"
      ]
    })
  }

  if (result.dynamicRange > 14) {
    fixes.push({
      title: "Too much dynamic range",
      steps: [
        "Compress drums and instruments",
        "Control peaks with limiter",
        "Aim for tighter loudness"
      ]
    })
  }

  if (result.stereoWidth < 0.2) {
    fixes.push({
      title: "Stereo too narrow",
      steps: [
        "Widen pads and synths",
        "Pan elements left/right",
        "Keep bass mono"
      ]
    })
  }

  if (result.brightness < 0.3) {
    fixes.push({
      title: "Lacks brightness",
      steps: [
        "Boost highs around 8–12kHz",
        "Add saturation",
        "Enhance hats and vocals"
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
  formData.append("track", file)
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
      setLoading(false)
      setLoadingStep("")
    }, 4200)

  } catch (err: any) {

    console.error("UPLOAD ERROR:", err?.response?.data || err.message)

    setLoading(false)
  }
}



  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start pt-32 px-6">

      {/* HEADER */}
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2
bg-gradient-to-r from-white via-purple-300 to-purple-500 
bg-clip-text text-transparent 
drop-shadow-[0_0_35px_rgba(139,92,246,0.8)]">
  Mastrify
</h2>

      <p className="text-purple-400 text-xs tracking-widest mb-6">
        ANALYSIS
      </p>

      <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-center 
bg-gradient-to-r from-white via-purple-200 to-blue-400 
bg-clip-text text-transparent 
drop-shadow-[0_0_40px_rgba(139,92,246,0.6)]">
  Your mix
  analysis  
</h1>

      <p className="text-gray-400 mt-4 mb-10 text-center max-w-xl">
        AI shows exactly what’s holding your track back — before you release it.
      </p>

      {/* UPLOAD */}
{!result && (
  <div className="w-full max-w-md flex flex-col gap-4">

    {/* hidden input */}
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

    {/* DROP BOX */}
    <div
      onClick={() => fileInputRef.current?.click()}
      className="relative cursor-pointer"
    >
      {/* glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-xl rounded-xl" />

      {/* box */}
      <div className="relative bg-white/5 border border-white/10 p-4 rounded-xl text-white/60 hover:border-purple-500 transition text-center">
        {file ? file.name : "Drop your track here"}
      </div>
    </div>

    {/* BUTTON */}
    <button
  onClick={() => {
    if (!file) {
      fileInputRef.current?.click()
    } else {
      handleUpload()
    }
  }}
  className="bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 rounded-xl text-lg font-semibold hover:opacity-90 transition"
>
  {file ? "Scan my track" : "Choose track"}
</button>

    {/* INFO TEXT */}
    <p className="text-xs text-gray-500 text-center mt-2 opacity-80">
      Instant feedback • Takes 10 seconds • No signup
    </p>

  </div>
)}

      {/* LOADING */}
      {loading && (
        <p className="mt-4 text-purple-300 text-sm animate-pulse">
          {loadingStep || "Analyzing your mix..."}
        </p>
      )}

      {/* RESULT */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 w-full max-w-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 p-6 rounded-2xl backdrop-blur"
        >

          {/* SCORE */}
          <h2 className="text-2xl font-bold">
  Your mix is
  <span className="text-purple-400 ml-2">
    {result.mixQuality != null ? Math.round(result.mixQuality) : 0}%
  </span>
  ready for release
</h2>



{verdict && (
  <p className="text-green-400 text-sm mt-2">
    {verdict}
  </p>
)}



        <div className="text-xs text-gray-400 mb-4 space-y-1">
  <div>
  • Stereo width {result.stereoWidth > 0.25 ? "good" : "needs improvement"} ({Math.round(result.stereoWidth * 100)}%)
</div>
  <div>• Dynamic range is healthy ({Math.round(result.dynamicRange)})</div>
  <div>• Frequency balance is stable</div>
</div>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4 mt-6 mb-6 text-sm">

            <Stat label="LUFS" value={result.lufs} />
            <Stat label="Dynamic Range" value={result.dynamicRange} />

            <Stat label="Stereo Width" value={result.stereoWidth} percent />
            <Stat label="Low End" value={result.bassWeight} percent />

            <Stat label="Brightness" value={result.brightness} percent />
            <Stat label="Energy" value={result.energy} />

          </div>

          <p className="text-gray-400 mb-6">
  {issues.length > 0
    ? `AI found ${displayIssues.length} improvements in your mix`
    : "AI verdict: your mix is production-ready"}
</p>

{issues.length > 0 && (
  <p className="text-xs text-gray-400 mb-3">
    Fix these first for the biggest improvement
  </p>
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
      Most mixes fail here
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


{!showAll && displayIssues.length > 2 && (
  <button
    onClick={() => setShowWaitlist(true)}
    className="w-full mt-3 p-3 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition"
  >
    🔓 See what’s killing your mix
  </button>
)}
  </>
)}
          </div>

          {/* FIXES */}
<div className="mb-6">

  {issues.length > 0 ? (
    <>
      <h3 className="font-semibold mb-2">
        How to improve your mix
      </h3>

      {issues.map((issue: any, i: number) => {
        const rec = recommendations[i]
        const isLocked = false

        return (
          <div
  key={i}
  className={`mb-4 ${isLocked ? "blur-[6px] opacity-40" : ""}`}
>

            <div className="font-semibold text-white mb-1">
              {rec?.title || issue.text}
            </div>

            {rec?.steps?.map((step: string, j: number) => (
  <div key={j} className="text-sm text-gray-400 ml-2">
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


          {/* CTA */}
          

<div className="text-xs text-gray-400 text-center mt-2">
  ⚡ Limited early access — join before launch
</div>

          {!canMaster && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Improve your mix to unlock mastering
            </p>
          )}

        </motion.div>
)}

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