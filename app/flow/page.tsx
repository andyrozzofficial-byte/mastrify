"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import axios from "axios"
import { motion } from "framer-motion"
type Step = "upload" | "analyzing" | "done"

export default function FlowPage() {
  const API = "https://mastrify-backend-production.up.railway.app"
  const SHOW_REFERENCE = false

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingSeekRef = useRef(false)
  const pendingPlayRef = useRef(false)

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [masteredUrl, setMasteredUrl] = useState("")
  const [previewMode, setPreviewMode] = useState<"before" | "after">("after")
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

  const pendingSeekTimeRef = useRef<number | null>(null)

  const [wavePhase, setWavePhase] = useState(0)
  useEffect(() => {
    if (!isPlaying) return
    let raf = 0
    const tick = () => {
      setWavePhase((p) => (p + 0.015) % (Math.PI * 2))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying])

  const hashString = (s: string) => {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }

  const waveformPeaks = useMemo(() => {
    const seed = hashString(currentSrc || "silence")
    const bars = 72
    const peaks: number[] = []
    let x = seed || 1
    for (let i = 0; i < bars; i++) {
      // xorshift32
      x ^= x << 13
      x ^= x >>> 17
      x ^= x << 5
      const r = ((x >>> 0) % 1000) / 1000
      // keep it subtle and "audio-like" (avoid extreme spikes)
      const shaped = 0.18 + Math.pow(r, 1.8) * 0.82
      peaks.push(shaped)
    }
    return peaks
  }, [currentSrc])

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current
    if (!audio) return
    const dur = audio.duration
    if (!Number.isFinite(dur) || dur <= 0) return

    const clamped = Math.max(0, Math.min(1, ratio))

    // Respect the paid preview limiter: seeking maps to preview window for AFTER when unpaid.
    if (!isPaid && previewMode === "after") {
      const t = PREVIEW_START + clamped * PREVIEW_LENGTH
      audio.currentTime = Math.min(t, Math.max(0, dur - 0.1))
      return
    }

    audio.currentTime = Math.min(clamped * dur, Math.max(0, dur - 0.1))
  }

  const currentSrc = previewMode === "after" && masteredUrl ? masteredUrl : audioUrl

  console.log("CURRENT SRC:", currentSrc)
  
  const [referenceTrack, setReferenceTrack] = useState<File | null>(null)
  const [referenceName, setReferenceName] = useState("")
  const [referenceLoaded, setReferenceLoaded] = useState(false)
  
  const [displayText, setDisplayText] = useState("")
 

  const PREVIEW_START = 60
  const PREVIEW_LENGTH = 30

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const nextSrc = previewMode === "after" && masteredUrl ? masteredUrl : audioUrl
    if (!nextSrc) return

    console.log("SETTING AUDIO SRC:", nextSrc)

    audio.pause()
    audio.src = nextSrc
    audio.load()

    setIsPlaying(false)
  }, [previewMode, masteredUrl, audioUrl])

  // ---------------- FILE ----------------
  const handleFile = (e: any) => {
  const selected = e.target.files[0]
  if (!selected) return

  setFile(selected)
  setAudioUrl(URL.createObjectURL(selected))
  setMasteredUrl("")
  
  setStep("upload")
  setIsPaid(false)
}

  const handleDrop = (file: File) => {
  setFile(file)
  setAudioUrl(URL.createObjectURL(file))
  setMasteredUrl("")
  
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

  const runMaster = async () => {
  if (!file) return

  const autoMaster = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      if (SHOW_REFERENCE && referenceTrack) {
  formData.append("reference", referenceTrack)
}

      const res = await axios.post(`${API}/master`, formData)

      console.log("SERVER RESPONSE:", res.data)
console.log("MASTER PATH:", res.data.after)

const mastered =
  res.data.afterUrl ||
  res.data.fullUrl ||
  (res.data.after ? `${API}${res.data.after}` : "")

setMasteredUrl(mastered)
setPreviewMode("after")

} catch (err) {
  console.log("Auto master failed", err)
  throw err
}
  }

  // 🔥 START FAKE AI FLOW
  setStep("analyzing")
  setDisplayText("")

  setAiText("Initializing AI engine...")
  await sleep(800)

  setAiText("Analyzing dynamics...")
  await sleep(1200)

  setAiText("Detecting frequency imbalances...")
  await sleep(1200)

  setAiText("Optimizing loudness...")
  await sleep(1200)

  setAiText("Applying final mastering...")
  await sleep(1500)

  try {
    await autoMaster(file)

    setAiText("Finalizing...")
    await sleep(800)

    setProgress(100)
    setStep("done")

  } catch (err) {
    console.log(err)
    alert("Mastering failed")
    setStep("upload")
  }
}

  // ---------------- PLAYER ----------------
  

  useEffect(() => {
  const interval = setInterval(() => {

    const audio = audioRef.current
    if (!audio) return

    const current = audio.currentTime
    const duration = audio.duration || 1

    const previewProgress = (current - PREVIEW_START) / PREVIEW_LENGTH
setPlayProgress(Math.max(0, Math.min(1, previewProgress)) * 100)

    // 🔥 LIMIT AFTER PLAYBACK
    if (!isPaid && previewMode === "after") {

      const end = PREVIEW_START + PREVIEW_LENGTH

      if (current > end - 3) {
        audio.volume = Math.max(0, (end - current) / 3)
      }

      if (current >= end) {
        audio.pause()
        audio.volume = 1
        setIsPlaying(false)
      }
    }

  }, 200)

  return () => clearInterval(interval)
}, [previewMode, isPaid])

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

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => {
      if (!pendingSeekRef.current && !pendingPlayRef.current) return

      if (pendingSeekRef.current) {
        const desired = pendingSeekTimeRef.current ?? PREVIEW_START
        const safeTime = Math.min(desired, Math.max(0, (audio.duration || 0) - 0.1))
        audio.currentTime = safeTime
        pendingSeekRef.current = false
        pendingSeekTimeRef.current = null
      }

      if (pendingPlayRef.current) {
        pendingPlayRef.current = false
        audio.play().catch(() => {})
        setIsPlaying(true)
      }
    }

    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    return () => audio.removeEventListener("loadedmetadata", onLoadedMetadata)
  }, [])


  useEffect(() => {
  if (!masteredUrl) return

  // Default to AFTER when master becomes available
  if (step === "done") setPreviewMode("after")
}, [masteredUrl, step])

  const toggleBeforeAfter = (next: "before" | "after") => {
    const audio = audioRef.current
    if (!audio) return

    if (next === "after" && !masteredUrl) return
    if (next === "before" && !audioUrl) return

    if (next === previewMode) return

    // Switching tabs: preserve position, never autoplay.
    pendingSeekTimeRef.current = Math.max(0, audio.currentTime || 0)
    pendingSeekRef.current = true
    pendingPlayRef.current = false
    setPreviewMode(next)
  }

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    if (!currentSrc) return

    if (!audio.paused) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    audio.volume = 1
    pendingSeekRef.current = true
    pendingPlayRef.current = true

    // If we just switched sources, preserve position; otherwise default to preview start.
    if (pendingSeekTimeRef.current == null) {
      pendingSeekTimeRef.current = Math.max(0, audio.currentTime || PREVIEW_START)
    }

    if (audio.readyState >= 1) {
      const desired = pendingSeekTimeRef.current ?? PREVIEW_START
      const safeTime = Math.min(desired, Math.max(0, (audio.duration || 0) - 0.1))
      audio.currentTime = safeTime
      pendingSeekRef.current = false
      pendingSeekTimeRef.current = null

      audio.play().catch(() => {})
      pendingPlayRef.current = false
      setIsPlaying(true)
    } else {
      audio.load()
    }
  }
  

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

        {SHOW_REFERENCE && (
  <div className="mt-6 pt-4 flex flex-col items-center gap-3">

  <input type="file" onChange={handleReference} hidden id="refUpload" />

  <label
    htmlFor="refUpload"
    className="cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-xs transition"
  >
    Use reference track (optional)
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
)}


        

    {step !== "done" && (
  <button
  onClick={runMaster}
  disabled={!file || step === "analyzing"}
  className="px-12 py-5 mt-6 text-xl font-semibold text-white rounded-xl ...
bg-gradient-to-r from-purple-500 to-blue-500
shadow-[0_10px_40px_rgba(139,92,246,0.35)]
hover:shadow-[0_20px_60px_rgba(139,92,246,0.7)] hover:scale-[1.04]
active:scale-[0.97]
transition-all duration-300
disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {step === "analyzing"
      ? "Running mastering..."
      : "Master my track"}
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
        {step === "done" && (
          <div className="space-y-6">

            <div className="bg-white/5 p-6 rounded-xl">
              <p className="text-3xl font-bold 
bg-gradient-to-r from-white via-purple-200 to-blue-200 
bg-clip-text text-transparent 
drop-shadow-[0_0_25px_rgba(139,92,246,0.6)]">
  Your master is ready
</p>

<p className="text-sm text-white/50 mt-1">
  Industry-level master • Ready for release
</p>

  {masteredUrl && (
  <div className="mt-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-5 space-y-4 shadow-[0_12px_50px_rgba(0,0,0,0.55)]">

    <div className="grid grid-cols-2 gap-3">
      <motion.button
        type="button"
        onClick={() => toggleBeforeAfter("before")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
        className={
          previewMode === "before"
            ? "py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600/80 to-blue-600/80 shadow-[0_0_18px_rgba(139,92,246,0.28)] ring-1 ring-white/10 hover:brightness-105 transition-all duration-300"
            : "py-3 rounded-xl font-bold text-white/75 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 hover:text-white transition-all duration-300"
        }
      >
        ORIGINAL
      </motion.button>

      <motion.button
        type="button"
        onClick={() => toggleBeforeAfter("after")}
        disabled={!masteredUrl}
        whileHover={masteredUrl ? { scale: 1.02 } : undefined}
        whileTap={masteredUrl ? { scale: 0.99 } : undefined}
        className={
          previewMode === "after"
            ? "py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600/80 to-blue-600/80 shadow-[0_0_18px_rgba(59,130,246,0.26)] ring-1 ring-white/10 hover:brightness-105 transition-all duration-300"
            : "py-3 rounded-xl font-bold text-white/75 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 hover:text-white transition-all duration-300 disabled:opacity-35 disabled:cursor-not-allowed"
        }
      >
        MASTERED
      </motion.button>
    </div>

    <div className="flex items-center justify-center pt-0.5">
      <motion.button
        type="button"
        onClick={togglePlayPause}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="w-13 h-13 md:w-15 md:h-15 rounded-full grid place-items-center text-white bg-gradient-to-r from-purple-600/85 to-blue-600/85 shadow-[0_0_20px_rgba(139,92,246,0.28)] ring-1 ring-white/10 hover:brightness-105 transition-all duration-300"
      >
        <span className="text-xl md:text-2xl font-black leading-none">
          {isPlaying ? "❚❚" : "▶"}
        </span>
      </motion.button>
    </div>

    <div
      role="slider"
      aria-label="Waveform seek"
      className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 select-none cursor-pointer"
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / rect.width
        seekToRatio(ratio)
      }}
    >
      <div className="relative h-10">
        <div className="absolute inset-0 flex items-center gap-[3px]">
          {waveformPeaks.map((p, i) => {
            const barProgress = (i + 1) / waveformPeaks.length
            const active = (playProgress / 100) >= barProgress
            const wobble = isPlaying ? (Math.sin(wavePhase + i * 0.35) * 0.04) : 0
            const heightPct = Math.max(0.14, Math.min(1, p + wobble))
            return (
              <div
                key={i}
                className={
                  "flex-1 rounded-full transition-colors duration-200 " +
                  (active
                    ? "bg-gradient-to-t from-purple-400/70 to-blue-400/70"
                    : "bg-white/12")
                }
                style={{ height: `${Math.round(heightPct * 100)}%` }}
              />
            )
          })}
        </div>

        {/* playhead */}
        <motion.div
          className="absolute top-0 bottom-0 w-[2px] bg-white/35"
          animate={{ left: `${playProgress}%` }}
          transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
          style={{ transform: "translateX(-1px)" }}
        />
      </div>
    </div>


   <audio
  ref={audioRef}
  src={currentSrc}
  onEnded={() => setIsPlaying(false)}
/>

  </div>
)}

<div className="mt-4">


  {/* RESULT TEXT */}

  {/* 🟢 KÖP KNAPP (visas innan betalning) */}
{!isPaid && (
  <>
    
    <button
  onClick={handlePayment}
  className="mt-4 w-full py-5 text-lg rounded-xl font-bold 
bg-gradient-to-r from-purple-500 to-blue-500 text-white
shadow-[0_0_40px_rgba(139,92,246,0.4)]
hover:shadow-[0_0_60px_rgba(139,92,246,0.8)]
hover:scale-[1.02]
active:scale-[0.98]
transition-all duration-300"
>
      Export master


      <p className="text-xs text-white/40 mt-2 text-center">
  Ready for release • Instant download
</p>
    </button>

    
  </>
)}

{/* ⚡ DOWNLOAD KNAPP (visas efter betalning) */}
{isPaid && (
  <a
  href={masteredUrl ? `${masteredUrl}?download=1` : "#"}
  download="master.wav"
  className="block w-full py-5 mt-4 rounded-xl text-lg font-bold text-white text-center cursor-pointer
bg-gradient-to-r from-purple-500 to-blue-500
shadow-[0_0_40px_rgba(139,92,246,0.35)]
hover:brightness-110 hover:scale-[1.02]
active:scale-[0.98]
transition-all duration-300"
>
  Download master 🎧
</a>
)}


</div>



            </div>

          </div>
        )}

      </div>

    </main>
  )
}