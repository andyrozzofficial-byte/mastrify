"use client"

import { useState, useRef, useEffect } from "react"
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

  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [masteredUrl, setMasteredUrl] = useState("")
  const [selectedSource, setSelectedSource] = useState<"original" | "mastered">("mastered")
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

  const desiredPreviewTimeRef = useRef<number>(60)

  const getSelectedAudioEl = () => {
    return selectedSource === "mastered" ? masteredAudioRef.current : originalAudioRef.current
  }

  const getOtherAudioEl = () => {
    return selectedSource === "mastered" ? originalAudioRef.current : masteredAudioRef.current
  }
  
  const [referenceTrack, setReferenceTrack] = useState<File | null>(null)
  const [referenceName, setReferenceName] = useState("")
  const [referenceLoaded, setReferenceLoaded] = useState(false)
  
  const [displayText, setDisplayText] = useState("")
 

  const PREVIEW_START = 60
  const PREVIEW_DURATION = 30
  const PREVIEW_END = PREVIEW_START + PREVIEW_DURATION

  const clampToPreviewWindow = (t: number) => {
    if (!Number.isFinite(t) || t < PREVIEW_START || t > PREVIEW_END) return PREVIEW_START
    return t
  }

  const safePreviewTimeForEl = (el: HTMLAudioElement | null, preferred: number) => {
    const base = clampToPreviewWindow(preferred)
    const dur = el?.duration
    if (el && Number.isFinite(dur) && (dur as number) > 0) {
      return Math.min(base, Math.max(0, (dur as number) - 0.1))
    }
    return base
  }

  const pauseBoth = () => {
    const a = originalAudioRef.current
    const b = masteredAudioRef.current
    a?.pause()
    b?.pause()
    setIsPlaying(false)
  }

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
setSelectedSource("mastered")

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
  

  // Update progress + enforce preview window based on the selected audio element only.
  useEffect(() => {
    const el = getSelectedAudioEl()
    if (!el) return

    const onTimeUpdate = () => {
      const current = el.currentTime || 0
      const p = (current - PREVIEW_START) / PREVIEW_DURATION
      setPlayProgress(Math.max(0, Math.min(1, p)) * 100)

      if (current >= PREVIEW_END) {
        pauseBoth()
        const safeT = safePreviewTimeForEl(el, PREVIEW_START)
        el.currentTime = safeT
        desiredPreviewTimeRef.current = safeT
        setPlayProgress(0)
      } else {
        desiredPreviewTimeRef.current = clampToPreviewWindow(current)
      }
    }

    el.addEventListener("timeupdate", onTimeUpdate)
    return () => el.removeEventListener("timeupdate", onTimeUpdate)
  }, [selectedSource, masteredUrl, audioUrl])

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

  // When metadata becomes available, keep both players aligned to the desired preview time.
  useEffect(() => {
    const original = originalAudioRef.current
    const mastered = masteredAudioRef.current
    const desired = desiredPreviewTimeRef.current

    const syncEl = (el: HTMLAudioElement | null) => {
      if (!el) return
      const t = safePreviewTimeForEl(el, desired)
      try {
        el.currentTime = t
      } catch {
        // ignore (can happen before enough data is loaded on iOS)
      }
    }

    const onReadyOriginal = () => syncEl(original)
    const onReadyMastered = () => syncEl(mastered)

    original?.addEventListener("loadedmetadata", onReadyOriginal)
    original?.addEventListener("canplay", onReadyOriginal)
    mastered?.addEventListener("loadedmetadata", onReadyMastered)
    mastered?.addEventListener("canplay", onReadyMastered)

    return () => {
      original?.removeEventListener("loadedmetadata", onReadyOriginal)
      original?.removeEventListener("canplay", onReadyOriginal)
      mastered?.removeEventListener("loadedmetadata", onReadyMastered)
      mastered?.removeEventListener("canplay", onReadyMastered)
    }
  }, [masteredUrl, audioUrl])


  useEffect(() => {
  if (!masteredUrl) return

  // Default to AFTER when master becomes available
  if (step === "done") setSelectedSource("mastered")
}, [masteredUrl, step])

  const selectSource = (next: "original" | "mastered") => {
    if (next === "mastered" && !masteredUrl) return
    if (next === "original" && !audioUrl) return
    if (next === selectedSource) return

    const currentEl = getSelectedAudioEl()
    const rawT = Math.max(0, currentEl?.currentTime || 0)
    const safeT = clampToPreviewWindow(rawT)

    // On source switch: pause both, keep preview position (60–90) or reset to 60, no autoplay.
    pauseBoth()

    desiredPreviewTimeRef.current = safeT

    // Keep both audio elements aligned to the same preview position (if possible right now).
    const a = originalAudioRef.current
    const b = masteredAudioRef.current
    if (a && a.readyState >= 1) a.currentTime = safePreviewTimeForEl(a, safeT)
    if (b && b.readyState >= 1) b.currentTime = safePreviewTimeForEl(b, safeT)

    setSelectedSource(next)
  }

  const togglePlayPause = () => {
    const selectedEl = getSelectedAudioEl()
    if (!selectedEl) return

    // Pause = pause both
    if (!selectedEl.paused) {
      pauseBoth()
      return
    }

    const otherEl = getOtherAudioEl()
    const rawT = Math.max(0, selectedEl.currentTime || desiredPreviewTimeRef.current || PREVIEW_START)
    const safeT = safePreviewTimeForEl(selectedEl, clampToPreviewWindow(rawT))
    desiredPreviewTimeRef.current = safeT

    // Before playing selected ref:
    // - pause the other ref
    // - set other ref currentTime to same preview position (if possible)
    otherEl?.pause()
    if (otherEl && otherEl.readyState >= 1) {
      try {
        otherEl.currentTime = safePreviewTimeForEl(otherEl, safeT)
      } catch {
        // ignore
      }
    }

    // Ensure selected starts inside 60–90 window.
    if (selectedEl.readyState < 1) selectedEl.load()
    try {
      selectedEl.currentTime = safeT
    } catch {
      // If iOS blocks setting currentTime before ready, it will be applied on metadata/canplay.
    }

    // Must be called directly inside the user tap handler for iOS.
    selectedEl.play().then(
      () => setIsPlaying(true),
      (e) => {
        console.log("AUDIO PLAY FAILED:", e)
        setIsPlaying(false)
      }
    )
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
        onClick={() => selectSource("original")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
        className={
          selectedSource === "original"
            ? "py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600/80 to-blue-600/80 shadow-[0_0_18px_rgba(139,92,246,0.28)] ring-1 ring-white/10 hover:brightness-105 transition-all duration-300"
            : "py-3 rounded-xl font-bold text-white/75 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 hover:text-white transition-all duration-300"
        }
      >
        ORIGINAL
      </motion.button>

      <motion.button
        type="button"
        onClick={() => selectSource("mastered")}
        disabled={!masteredUrl}
        whileHover={masteredUrl ? { scale: 1.02 } : undefined}
        whileTap={masteredUrl ? { scale: 0.99 } : undefined}
        className={
          selectedSource === "mastered"
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
        className="w-12 h-12 md:w-14 md:h-14 rounded-full grid place-items-center bg-black/45 backdrop-blur-xl border border-white/10 text-white shadow-[inset_0_0_18px_rgba(139,92,246,0.16)] hover:brightness-110 transition-all duration-300"
      >
        {isPlaying ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <rect x="4.5" y="4" width="4" height="12" rx="1.2" fill="white" opacity="0.92" />
            <rect x="11.5" y="4" width="4" height="12" rx="1.2" fill="white" opacity="0.92" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7.2 4.8v10.4c0 .8.9 1.3 1.6.9l8.2-5.2c.7-.4.7-1.4 0-1.8L8.8 3.9c-.7-.4-1.6.1-1.6.9Z"
              fill="white"
              opacity="0.92"
            />
          </svg>
        )}
      </motion.button>
    </div>

    <div className="w-full h-[6px] rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-purple-400/70 to-blue-400/70"
        animate={{ width: `${playProgress}%` }}
        transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      />
      <div className="pointer-events-none -mt-[6px] h-[6px] w-full shadow-[0_0_14px_rgba(139,92,246,0.16)]" />
    </div>

  {/* Hidden preloaded audio elements (avoid iOS src swapping issues) */}
  <audio
    ref={originalAudioRef}
    src={audioUrl}
    playsInline
    preload="auto"
    style={{ display: "none" }}
    onEnded={() => {
      pauseBoth()
      const el = originalAudioRef.current
      if (el) el.currentTime = safePreviewTimeForEl(el, PREVIEW_START)
      desiredPreviewTimeRef.current = PREVIEW_START
      setPlayProgress(0)
    }}
  />
  <audio
    ref={masteredAudioRef}
    src={masteredUrl}
    playsInline
    preload="auto"
    style={{ display: "none" }}
    onEnded={() => {
      pauseBoth()
      const el = masteredAudioRef.current
      if (el) el.currentTime = safePreviewTimeForEl(el, PREVIEW_START)
      desiredPreviewTimeRef.current = PREVIEW_START
      setPlayProgress(0)
    }}
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