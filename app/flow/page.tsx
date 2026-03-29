"use client"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { motion } from "framer-motion"
type Step = "upload" | "analyzing" | "done"

export default function FlowPage() {

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [masteredUrl, setMasteredUrl] = useState("")
  const [preview, setPreview] = useState<"mastered" | "original">("mastered")

  const [isPaid, setIsPaid] = useState(() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("paid") === "true"
  }
  return false
})

  const [step, setStep] = useState<Step>("upload")
  const [aiText, setAiText] = useState("")
  const [progress, setProgress] = useState(0)
  
  const [loadingMaster, setLoadingMaster] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [referenceTrack, setReferenceTrack] = useState<File | null>(null)
  const [referenceName, setReferenceName] = useState("")
  const [referenceLoaded, setReferenceLoaded] = useState(false)
  const [fixes, setFixes] = useState<any[]>([])
  const [displayText, setDisplayText] = useState("")
 

  const PREVIEW_START = 30
  const PREVIEW_LENGTH = 30

  // ---------------- FILE ----------------
  const handleFile = (e: any) => {
  const selected = e.target.files[0]
  if (!selected) return

  setFile(selected)
  setAudioUrl(URL.createObjectURL(selected))
  setMasteredUrl("")
  setAnalysisData(null) // 🔥 viktigt
  setStep("upload")
  setIsPaid(false)
}

  const handleDrop = (file: File) => {
  setFile(file)
  setAudioUrl(URL.createObjectURL(file))
  setMasteredUrl("")
  setAnalysisData(null) // 🔥 viktigt
  setStep("upload")
  setIsPaid(false)
}

  const handleReference = (e: any) => {
  const selected = e.target.files[0]
  if (!selected) return

  setReferenceTrack(selected)
  setReferenceName(selected.name)
  setReferenceLoaded(true)

}

  // ---------------- ANALYSIS ----------------
  const runAnalysis = async () => {
  if (!file) return

  setStep("analyzing")

  setDisplayText("")
  setAiText("Analyzing your mix...")
  await sleep(1500)

  try {
    const formData = new FormData()
    formData.append("track", file)

    // 🎯 ANALYZE
    const res = await axios.post("http://127.0.0.1:3002/upload", formData)
    setAnalysisData(res.data)

    // 🎯 FIX
    setDisplayText("")
    setAiText("Detecting issues...")
    await sleep(1500)

    const fixRes = await axios.post("http://127.0.0.1:3002/fix-mix", formData)
    setFixes(fixRes.data.fixes)

    // 🎯 MASTER
    setDisplayText("")
    setAiText("Creating pro master...")
    
    await sleep(1500)

    await autoMaster(file)

    setProgress(100)
setStep("done")

  } catch (err) {
    console.log(err)
    alert("Analysis failed")
    setStep("upload")
  }
}
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
const fixMyMix = async () => {
  console.log("FIX CLICKED")

  if (!file) return
  setStep("analyzing")
  setDisplayText("")
  setAiText("Analyzing your mix...")
  await sleep(1500)

  try {
    const formData = new FormData()
    formData.append("track", file)

    setDisplayText("")
    setAiText("Detecting issues...")
    await sleep(1500)   

    const res = await axios.post("http://127.0.0.1:3002/fix-mix", formData)

    setFixes(res.data.fixes)

    setDisplayText("")
    setAiText("Generating pro mix feedback...")
    await sleep(1500)

setStep("done")

  } catch (err) {
    alert("Fix failed")
  }
}

const autoMaster = async (file: File) => {
  try {
    const formData = new FormData()
    formData.append("file", file)

    if (referenceTrack) {
    formData.append("reference", referenceTrack)
  }



    const res = await axios.post("http://127.0.0.1:3002/master", formData)

    setMasteredUrl(`http://127.0.0.1:3002${res.data.after}`)
    setPreview("mastered")

  } catch (err) {
    console.log("Auto master failed", err)
  }
}
  // ---------------- MASTER ----------------
  const handleMaster = async () => {
    if (!file) return

    setLoadingMaster(true)

    const formData = new FormData()
    formData.append("file", file)

    if (referenceTrack) {
    formData.append("reference", referenceTrack)
}

    try {
      const res = await axios.post("http://127.0.0.1:3002/master", formData)
      setMasteredUrl(`http://127.0.0.1:3002${res.data.after}`)
      setPreview("mastered")
    } catch {
      alert("Error processing track")
    }

    setLoadingMaster(false)
  }

    const togglePlay = () => {
  if (!audioRef.current) return

  if (audioRef.current.paused) {
    audioRef.current.play()
  } else {
    audioRef.current.pause()
  }
}

  // ---------------- PLAYER ----------------
  useEffect(() => {
  const audio = audioRef.current
  if (!audio) return

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)

  audio.addEventListener("play", handlePlay)
  audio.addEventListener("pause", handlePause)

  return () => {
    audio.removeEventListener("play", handlePlay)
    audio.removeEventListener("pause", handlePause)
  }
}, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!audioRef.current) return

      const current = audioRef.current.currentTime
      const duration = audioRef.current.duration || 1

      setPlayProgress((current / duration) * 100)

      // 🔥 LIMIT MASTER PLAYBACK
      if (!isPaid && preview === "mastered") {

        const end = PREVIEW_START + PREVIEW_LENGTH

        // Fade out sista 3 sek
        if (current > end - 3) {
          audioRef.current.volume = Math.max(0, (end - current) / 3)
        }

        if (current >= end) {
          audioRef.current.pause()
          audioRef.current.volume = 1
          setIsPlaying(false)
        }
      }

    }, 200)

    return () => clearInterval(interval)
  }, [preview, isPaid])

  useEffect(() => {
  if (!aiText) return

  let i = 0

  // 🔥 RESET direkt (viktigt)
  setDisplayText("")

  const interval = setInterval(() => {
    setDisplayText(() => {
      return aiText.slice(0, i + 1)
    })

    i++

    if (i >= aiText.length) {
      clearInterval(interval)
    }
  }, 40)

  return () => clearInterval(interval)
}, [aiText])
useEffect(() => {
  if (step !== "analyzing") return

  setProgress(0)

  const interval = setInterval(() => {
    setProgress((p) => {
      if (p >= 95) return p // stannar lite innan 100 för realism
      return p + Math.random() * 5
    })
  }, 200)

  return () => clearInterval(interval)
}, [step])

  const [showSuccess, setShowSuccess] = useState(false)

const handlePayment = () => {
  localStorage.setItem("paid", "true")
  setIsPaid(true)
  setShowSuccess(true)
}

  const currentSrc =
    preview === "mastered" && masteredUrl ? masteredUrl : audioUrl

  // ---------------- UI ----------------

  if (!mounted) return null

  return (
    <main className="min-h-screen flex items-start justify-center pt-20 px-6 text-white relative overflow-hidden bg-black">

  {/* BACKGROUND */}
<div className="absolute inset-0 z-0 pointer-events-none">

  {/* radial glow */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.35),transparent_65%)]" />

  {/* purple blob */}
<div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-500/25 blur-[220px] rounded-full animate-[floatY_8s_ease-in-out_infinite]" />

{/* blue blob */}
<div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/20 blur-[220px] rounded-full animate-[floatY_10s_ease-in-out_infinite]" />

  {/* dark overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />

</div>

      <div className="relative z-50 pointer-events-auto w-full max-w-xl text-center space-y-12">

        <h1 className="text-5xl font-bold mt-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
  Drop your track
</h1>

        {/* UPLOAD */}

        <div
          className="border border-white/10 rounded-2xl p-12 bg-white/5 backdrop-blur-md overflow-visible"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const dropped = e.dataTransfer.files[0]
            if (dropped) handleDrop(dropped)
          }}
        >
          <input type="file" onChange={handleFile} hidden id="fileUpload" />

          <label
  htmlFor="fileUpload"
  className="cursor-pointer w-full inline-block text-center py-4 text-lg rounded-xl font-semibold transition-all duration-200
bg-gradient-to-r from-purple-500 to-blue-500 text-white
shadow-[0_8px_25px_rgba(139,92,246,0.25)]
hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(139,92,246,0.6)]"
>
            Select track
          </label>

          <p className="text-xs mt-3 text-white/40">
            {file ? file.name : "No file selected"}
          </p>
        </div>

        <div className="mt-6 pt-4 flex flex-col items-center gap-3">

  <input type="file" onChange={handleReference} hidden id="refUpload" />

  <label
    htmlFor="refUpload"
    className="cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-xs transition"
  >
    🎧 Add reference track
  </label>

  {/* STATUS */}
  {referenceLoaded ? (
    <div className="flex items-center gap-2 text-green-400 text-xs animate-pulse">
      <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.9)]"></span>
      Reference loaded
      <p className="text-xs text-green-400/70">
  Matching tonal balance & loudness to your reference
</p>
    </div>
  ) : (
    <p className="text-xs text-white/40">
      No reference track selected
    </p>
  )}

  {/* FILNAMN + REMOVE */}
  {referenceLoaded && (
    <div className="flex items-center gap-3 text-xs text-white/70">

      <span>{referenceName}</span>

      <button
        onClick={() => {
          setReferenceTrack(null)
          setReferenceName("")
          setReferenceLoaded(false)
        }}
        className="text-red-400 hover:text-red-300 transition"
      >
        ✕ Remove
      </button>

    </div>
  )}

</div>

        {/* PLAYER */}
        {(audioUrl || masteredUrl) && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm rounded-xl p-5 space-y-4">

            <p className="text-xs text-purple-300">A/B your master</p>

            <p className="text-xs text-white/40">
  Original vs Master
</p>

            {masteredUrl && (
              <div className="flex justify-center">
  <div className="bg-white/5 p-1 rounded-full flex gap-1 backdrop-blur-md border border-white/10">

    <button
      onClick={() => {
  setPreview("original")

  audioRef.current?.pause()
  audioRef.current?.load()

  setTimeout(() => {
    audioRef.current?.play()
    setIsPlaying(true)
  }, 100)
}}
      className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-200
      ${
        preview === "original"
          ? "bg-white text-black shadow"
          : "text-white/50 hover:text-white"
      }`}
    >
      Original
    </button>

    <button
      onClick={() => {
  setPreview("mastered")

  audioRef.current?.pause()
  audioRef.current?.load()

  setTimeout(() => {
    audioRef.current?.play()
    setIsPlaying(true)
  }, 100)
}}
      className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all duration-200
      ${
        preview === "mastered"
          ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-none"
          : "text-white/50 hover:text-white"
      }`}
    >
      Mastered
    </button>

  </div>
</div>
            )}

            <button
  onClick={() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
  audioRef.current.currentTime = PREVIEW_START
  audioRef.current.play()
  setIsPlaying(true)
}
  }}
  className={`w-full py-3 rounded-xl font-semibold transition-all duration-200
${isPlaying 
  ? "bg-white/10 text-white border border-white/20"
  : "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:scale-[1.02]"
}`}
>
  {isPlaying ? "Pause preview" : "Play preview"}
</button>

            <button
  onClick={handleMaster}
  className="mt-3 text-xs text-white/30 hover:text-white hover:scale-105 hover:tracking-wider transition-all"
>
  {loadingMaster
  ? "⚡ Mastering..."
  : masteredUrl
  ? "↻ Remaster track"
  : "⚡ Master track"}
</button>

            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-200"
    style={{ width: `${playProgress}%` }}
  />
</div>

            {!isPaid && preview === "mastered" && (
              <p className="text-xs text-red-400">
                Preview (drop section)
              </p>
            )}

            <audio
  ref={audioRef}
  src={currentSrc}
  onEnded={() => setIsPlaying(false)}
/>
          </div>
        )}

        

    {step !== "done" && (
  <button
    onClick={runAnalysis}
    disabled={step === "analyzing"}
    className="relative px-10 py-5 mt-6 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-xl font-semibold text-white text-xl shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-200 overflow-visible disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 blur-xl opacity-20"></span>

    <span className="relative z-10">
      {step === "analyzing"
        ? "Running mastering chain..."
        : "Master my track"}
    </span>
  </button>
)}

        {/* ANALYZING */}
        {step === "analyzing" && (
          <div className="space-y-4">
            <p className="text-sm text-purple-300 font-mono">
  {displayText}<span className="animate-pulse">|</span>
</p>

            <div className="w-full bg-white/10 h-2 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-blue-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* RESULT */}
        {(fixes.length > 0 || step === "done") && (
          <div className="space-y-6">

            <div className="bg-white/5 p-6 rounded-xl">
              <p className="text-3xl font-bold text-green-400">
  Your master is ready
          
</p>

<p className="text-sm text-white/60 mt-1">
  Industry-level master • Ready for release
</p>

Release-ready



{analysisData && (
  <div className="bg-white/5 p-6 rounded-xl text-left space-y-3 mt-4">

    <p className="text-sm text-purple-300 font-semibold">
      Mix Analysis
    </p>

   <div className="space-y-3">

  {/* MIX */}
  <div>
    <p className="text-xs text-white/50 mb-1">Mix</p>
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-purple-400 to-blue-400"
        style={{ width: `${Math.round(analysisData?.mixQuality ?? 0)}%` }}
      />
    </div>
    <p className="text-xs text-white/60 mt-1">
  {Math.round(analysisData?.mixQuality ?? 0)}/100
</p>
  </div>

  {/* LOUDNESS */}
  <div>
    <p className="text-xs text-white/50 mb-1">Loudness</p>
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-pink-400 to-red-400"
        style={{ width: `${Math.round(analysisData?.loudnessScore ?? 0)}%` }}
      />
    </div>
    <p className="text-xs text-white/60 mt-1">
  {Math.round(analysisData?.loudnessScore ?? 0)}/100
</p>
  </div>

  {/* POTENTIAL */}
  <div className="mt-2">
    <p className={`text-sm font-semibold ${
      analysisData?.potentialLabel === "High"
        ? "text-green-400"
        : analysisData?.potentialLabel === "Medium"
        ? "text-yellow-400"
        : "text-blue-400"
    }`}>
      Potential: {analysisData?.potentialLabel}
    </p>

    <p className="text-xs text-white/50 mt-1">
  {
    analysisData?.potentialLabel === "High"
      ? "Strong improvement potential"
      : analysisData?.potentialLabel === "Medium"
      ? "Mastering will enhance clarity and punch"
      : analysisData?.potentialLabel === "Already mastered"
      ? "Already close to release quality"
      : ""
  }
</p>
  </div>

</div>

    {analysisData.mixTips?.map((tip: string, i: number) => (
      <p key={i} className="text-xs text-white/70">
        • {tip}
      </p>
    ))}

  </div>
)}

{fixes.length > 0 && (
  <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-xl text-left space-y-3 mt-4">

    
    <p className="text-sm text-red-300 font-semibold animate-pulse">
      Pro Mix Enhancements
    </p>

    <p className="text-xs text-white/40">
      Recommended mix improvements
    </p>

    {fixes.map((fix, i) => (
      <div
        key={i}
        className="mb-3 opacity-0 animate-[fadeIn_0.5s_ease_forwards]"
        style={{ animationDelay: `${i * 0.2}s` }}
      >
        <p className="text-xs text-white/70">
          • {fix.issue}
        </p>

        <p className="text-xs text-green-400">
          → {fix.fix}
        </p>

        <p className="text-xs text-white/40">
          {fix.proTip}
        </p>
      </div>
    ))}

  </div>
)}

{analysisData?.masteringChain && (
  <div className="bg-white/[0.03] border border-white/5 p-6 rounded-xl text-left space-y-3 mt-4 backdrop-blur-xl">

    <p className="text-sm text-purple-300 font-semibold">
      Mastering Chain
    </p>

    {analysisData.masteringChain.map((step: any, i: number) => (
      <div key={i} className="mb-4 border-b border-white/5 pb-3">
        <p className={`text-xs ${
  step.type === "limiter"
    ? "text-red-400 font-semibold"
    : "text-green-400"
}`}>

  <span className="font-semibold">
    {step.type === "gain" && "🔊 "}
    {step.type === "eq" && "🎛️ "}
    {step.type === "stereo" && "🎧 "}
    {step.type === "compression" && "📦 "}
    {step.type === "limiter" && "🚀 "}

    {step.type.toUpperCase()}
  </span>{" "}
  {step.value}

</p>

        <p className="text-xs text-white/50">
          {step.reason}
        </p>
      </div>
    ))}

  </div>
)}

          <p className="text-xs text-white/30 mt-2">
  Optimized for Spotify, Apple Music & streaming platforms
</p>
<p className="text-sm text-white/70 mt-1">
  Cleaner • Louder • Wider
</p>

<p className="text-sm text-white/50 mt-1">
  Your track is now optimized for streaming & release
</p>



<div className="mt-4">

  {/* RESULT TEXT */}
  <p className="text-xl text-green-400 font-semibold mt-4 mb-2 text-center">
  Your track is ready for release
</p>

  {/* 🟢 KÖP KNAPP (visas innan betalning) */}
{!isPaid && (
  <>
    <button
  onClick={handlePayment}
  className="w-full py-5 text-lg rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:brightness-110 transition active:scale-[0.98]"
>
      Download full master – €5

      <p className="text-xs text-white/50 mt-2 text-center">
        No subscription • Instant download
      </p>
    </button>

    
  </>
)}

{/* ⚡ DOWNLOAD KNAPP (visas efter betalning) */}
{isPaid && (
  <a
  href={masteredUrl || "#"}
  onClick={(e) => {
    if (!masteredUrl) {
      e.preventDefault()
      alert("Master not ready yet")
    }
  }}
  download
  className="block w-full py-5 mt-4 rounded-xl bg-green-500 text-black font-bold text-lg hover:brightness-110 transition text-center cursor-pointer"
>
  Unlock full master 🎧
</a>
)}

<p className="text-xs text-white/40 mt-2">
  Your master is ready for download
</p>

<p className="text-xs text-white/40 mt-2">
  Instant download • Ready in seconds
</p>

</div>

              <div className="flex justify-center gap-4 text-xs mt-4 flex-wrap">
  <span className="text-green-400">✓ Loudness optimized</span>
  <span className="text-green-400">✓ Stereo balanced</span>
  <span className="text-green-400">✓ Streaming ready</span>
</div>

            </div>

          </div>
        )}

      </div>

    </main>
  )
}