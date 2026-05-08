"use client"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion"
type Step = "upload" | "analyzing" | "done"

export default function FlowPage() {
  const API = "https://mastrify-backend-production.up.railway.app"
  const SHOW_REFERENCE = false

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
  const [mounted, setMounted] = useState(false)
  const [isMobileClient, setIsMobileClient] = useState(false)

  useEffect(() => {
    setMounted(true)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
    setIsMobileClient(/iPhone|iPad|iPod|Android|Mobile/i.test(ua))
  }, [])

  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null)
  const mobileAudioRef = useRef<HTMLAudioElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [masteredUrl, setMasteredUrl] = useState("")
  const [masteredPreviewMp3Url, setMasteredPreviewMp3Url] = useState("")
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

  const selectedSourceRef = useRef<"original" | "mastered">("mastered")

  useEffect(() => {
    selectedSourceRef.current = selectedSource
  }, [selectedSource])

  const getSelectedAudioEl = () => {
    if (isMobileClient) return mobileAudioRef.current
    return selectedSource === "mastered" ? masteredAudioRef.current : originalAudioRef.current
  }

  const getOtherAudioEl = () => {
    if (isMobileClient) return null
    return selectedSource === "mastered" ? originalAudioRef.current : masteredAudioRef.current
  }
  
  const [referenceTrack, setReferenceTrack] = useState<File | null>(null)
  const [referenceName, setReferenceName] = useState("")
  const [referenceLoaded, setReferenceLoaded] = useState(false)
  
  const [displayText, setDisplayText] = useState("")
 

  const PREVIEW_START = 60
  const PREVIEW_DURATION = 30
  const PREVIEW_END = PREVIEW_START + PREVIEW_DURATION

  const AI_STATUS = [
    "Initializing mastering engine",
    "Balancing low-end",
    "Enhancing stereo image",
    "Optimizing loudness",
    "Controlling dynamics",
    "Finalizing master",
  ]

  const safePreviewTimeForEl = (el: HTMLAudioElement | null) => {
    const dur = el?.duration
    if (el && Number.isFinite(dur) && (dur as number) > 0) {
      return Math.min(PREVIEW_START, Math.max(0, (dur as number) - 0.1))
    }
    return PREVIEW_START
  }

  const resetBothToPreviewStart = () => {
    const a = originalAudioRef.current
    const b = masteredAudioRef.current
    if (a) {
      try {
        a.currentTime = safePreviewTimeForEl(a)
      } catch {}
    }
    if (b) {
      try {
        b.currentTime = safePreviewTimeForEl(b)
      } catch {}
    }
  }

  const pauseBoth = () => {
    const a = originalAudioRef.current
    const b = masteredAudioRef.current
    a?.pause()
    b?.pause()
    setIsPlaying(false)
  }

  const pauseAll = () => {
    pauseBoth()
    mobileAudioRef.current?.pause()
    setIsPlaying(false)
  }

  const isIOSSafari = () => {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent || ""
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
    if (!isIOS) return false
    const isWebKit = /WebKit/i.test(ua)
    const isCriOS = /CriOS/i.test(ua)
    const isFxiOS = /FxiOS/i.test(ua)
    return isWebKit && !isCriOS && !isFxiOS
  }

  const masteredPreviewUrl = isIOSSafari() && masteredPreviewMp3Url ? masteredPreviewMp3Url : masteredUrl
  // MOBILE ONLY: mastered preview must always be MP3 (never WAV)
  const masteredMobilePreviewUrl = masteredPreviewMp3Url || ""
  const mobileSelectedUrl =
    selectedSource === "mastered" ? masteredMobilePreviewUrl : audioUrl

  const MOBILE_MASTERED_DURATION = 30

  // ---------------- FILE ----------------
  const handleFile = (e: any) => {
  const selected = e.target.files[0]
  if (!selected) return

  setFile(selected)
  setAudioUrl(URL.createObjectURL(selected))
  setMasteredUrl("")
  setMasteredPreviewMp3Url("")
  
  setStep("upload")
  setIsPaid(false)
}

  const handleDrop = (file: File) => {
  setFile(file)
  setAudioUrl(URL.createObjectURL(file))
  setMasteredUrl("")
  setMasteredPreviewMp3Url("")
  
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
console.log("MASTERED URL:", mastered)

const previewMp3 =
  res.data.previewAfterMp3Url ||
  (res.data.previewAfterMp3 ? `${API}${res.data.previewAfterMp3}` : "")
setMasteredPreviewMp3Url(previewMp3)

setSelectedSource("mastered")

} catch (err) {
  console.log("Auto master failed", err)
  throw err
}
  }

  // 🔥 START FAKE AI FLOW
  setStep("analyzing")
  setDisplayText("")

  for (let i = 0; i < AI_STATUS.length; i++) {
    setAiText(AI_STATUS[i] + "…")
    await sleep(i === 0 ? 650 : 950)
  }

  try {
    await autoMaster(file)

    setAiText("Preparing playback…")
    await sleep(650)

    setProgress(100)
    setStep("done")

  } catch (err) {
    console.log(err)
    alert("Mastering failed")
    setStep("upload")
  }
}

  // ---------------- PLAYER ----------------
  

  // DESKTOP: deterministic preview window using the two desktop audio elements.
  useEffect(() => {
    if (isMobileClient) return
    const original = originalAudioRef.current
    const mastered = masteredAudioRef.current
    if (!original || !mastered) return

    const attach = (el: HTMLAudioElement, label: "original" | "mastered") => {
      const isSelected = () => selectedSourceRef.current === label

      const onReady = () => {
        try {
          el.currentTime = safePreviewTimeForEl(el)
        } catch {}
      }

      const onTimeUpdate = () => {
        if (!isSelected()) return

        const t = el.currentTime
        if (Number.isFinite(t) && t >= PREVIEW_END) {
          pauseBoth()
          resetBothToPreviewStart()
          setIsPlaying(false)
          setPlayProgress(0)
          return
        }

        const p = ((t - PREVIEW_START) / PREVIEW_DURATION) * 100
        setPlayProgress(Math.max(0, Math.min(100, p)))
      }

      el.addEventListener("loadedmetadata", onReady)
      el.addEventListener("canplay", onReady)
      el.addEventListener("timeupdate", onTimeUpdate)

      return () => {
        el.removeEventListener("loadedmetadata", onReady)
        el.removeEventListener("canplay", onReady)
        el.removeEventListener("timeupdate", onTimeUpdate)
      }
    }

    const detachOriginal = attach(original, "original")
    const detachMastered = attach(mastered, "mastered")
    return () => {
      detachOriginal()
      detachMastered()
    }
  }, [audioUrl, masteredPreviewUrl, isMobileClient])

  // MOBILE: single preview audio element with src swapping (no competing elements).
  useEffect(() => {
    if (!isMobileClient) return
    const el = mobileAudioRef.current
    if (!el) return

    const onReady = () => {
      try {
        el.currentTime = PREVIEW_START
      } catch {}
    }

    const onTimeUpdate = () => {
      const t = el.currentTime
      const end = selectedSourceRef.current === "mastered" ? MOBILE_MASTERED_DURATION : PREVIEW_END
      const start = selectedSourceRef.current === "mastered" ? 0 : PREVIEW_START
      const duration = selectedSourceRef.current === "mastered" ? MOBILE_MASTERED_DURATION : PREVIEW_DURATION

      if (Number.isFinite(t) && t >= end) {
        el.pause()
        try {
          el.currentTime = start
        } catch {}
        setIsPlaying(false)
        setPlayProgress(0)
        return
      }

      const p = ((t - start) / duration) * 100
      setPlayProgress(Math.max(0, Math.min(100, p)))
    }

    el.addEventListener("loadedmetadata", onReady)
    el.addEventListener("canplay", onReady)
    el.addEventListener("timeupdate", onTimeUpdate)
    return () => {
      el.removeEventListener("loadedmetadata", onReady)
      el.removeEventListener("canplay", onReady)
      el.removeEventListener("timeupdate", onTimeUpdate)
    }
  }, [isMobileClient])

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

  // (metadata sync handled in the preview enforcement effect above)


  useEffect(() => {
  if (!masteredUrl) return

  // Default to AFTER when master becomes available
  if (step === "done") setSelectedSource("mastered")
}, [masteredUrl, step])

  const selectSource = (next: "original" | "mastered") => {
    if (next === "mastered" && !masteredUrl) return
    if (next === "original" && !audioUrl) return
    if (next === selectedSource) return

    pauseAll()
    setPlayProgress(0)

    setSelectedSource(next)
  }

  const waitForReady = (el: HTMLAudioElement) => {
    // Resolves when metadata is available for currentTime seeks (iOS-safe).
    if (el.readyState >= 1) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const done = () => {
        el.removeEventListener("loadedmetadata", done)
        el.removeEventListener("canplay", done)
        resolve()
      }
      el.addEventListener("loadedmetadata", done)
      el.addEventListener("canplay", done)
    })
  }

  const togglePlayPause = async () => {
    const selectedEl = getSelectedAudioEl()
    if (!selectedEl) return

    // Pause = pause both
    if (!selectedEl.paused) {
      pauseAll()
      return
    }

    const otherEl = getOtherAudioEl()

    // Before playing selected ref:
    // - pause the other ref
    otherEl?.pause()
    setIsPlaying(false)

    if (isMobileClient) {
      const el = mobileAudioRef.current
      if (!el) return
      const nextSrc = mobileSelectedUrl
      if (!nextSrc) return

      // MOBILE deterministic flow (single audio element)
      el.pause()
      if (el.src !== nextSrc) el.src = nextSrc
      el.load()
      await waitForReady(el)
      if (selectedSourceRef.current === "mastered") {
        // Mastered mobile preview is pre-cut (60s–90s), so play from 0.
        try {
          el.currentTime = 0
        } catch {}
      } else {
        try {
          el.currentTime = PREVIEW_START
        } catch {}
      }

      setPlayProgress(0)
      try {
        await el.play()
        setIsPlaying(true)
      } catch (e) {
        console.log("AUDIO PLAY FAILED:", e)
        setIsPlaying(false)
      }
      return
    }

    // DESKTOP flow (two audio elements already in DOM)
    // Desktop MASTERED must use the WAV master URL (afterUrl/fullUrl).
    if (selectedSourceRef.current === "mastered") {
      console.log("[desktop] selectedSource:", selectedSourceRef.current)
      console.log("[desktop] mastered desktop URL:", masteredUrl)

      if (!masteredUrl || !/^https:\/\//i.test(masteredUrl)) {
        console.log("[desktop] invalid masteredUrl:", masteredUrl)
        setIsPlaying(false)
        return
      }

      // Ensure the mastered audio element is actually pointing at the WAV URL.
      const masteredEl = masteredAudioRef.current
      if (masteredEl) {
        console.log("[desktop] audio.src before play:", masteredEl.src)
        if (masteredEl.src !== masteredUrl) {
          masteredEl.pause()
          masteredEl.src = masteredUrl
        }
        masteredEl.load()
        await waitForReady(masteredEl)
        try {
          masteredEl.currentTime = PREVIEW_START
        } catch {}
        setPlayProgress(0)
        try {
          await masteredEl.play()
          setIsPlaying(true)
        } catch (e) {
          console.log("[desktop] play error:", e)
          setIsPlaying(false)
        }
      }
      return
    }

    // Desktop ORIGINAL (keep existing behavior)
    selectedEl.load()
    await waitForReady(selectedEl)
    try {
      selectedEl.currentTime = PREVIEW_START
    } catch {}
    setPlayProgress(0)
    try {
      await selectedEl.play()
      setIsPlaying(true)
    } catch (e) {
      console.log("AUDIO PLAY FAILED:", e)
      setIsPlaying(false)
    }
  }
  

  // ---------------- UI ----------------

  if (!mounted) return null

  return (
    <main className="min-h-screen flex items-start justify-center pt-20 px-6 text-white relative overflow-hidden bg-black">

  {/* BACKGROUND */}
<div className="absolute inset-0 z-0 pointer-events-none">

  {/* radial glow */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.20),transparent_62%)]" />

  {/* purple blob */}
<div className="absolute top-[-220px] left-1/2 -translate-x-1/2 w-[780px] h-[780px] bg-purple-500/16 blur-[240px] rounded-full animate-[floatY_8s_ease-in-out_infinite]" />

{/* blue blob */}
<div className="absolute bottom-[-220px] left-1/2 -translate-x-1/2 w-[780px] h-[780px] bg-blue-500/14 blur-[240px] rounded-full animate-[floatY_10s_ease-in-out_infinite]" />

  {/* dark overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/92" />

</div>

      <div className="relative z-50 pointer-events-auto w-full max-w-xl text-center space-y-12">

        <h1 className="text-5xl font-semibold tracking-tight mt-6 bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent">
  Drop your track
</h1>

        {/* UPLOAD */}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="border border-white/12 rounded-2xl p-12 bg-white/[0.06] backdrop-blur-xl overflow-visible shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-[0_22px_70px_rgba(0,0,0,0.55)]"
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
shadow-[0_10px_30px_rgba(0,0,0,0.45)]
hover:brightness-110 hover:shadow-[0_14px_46px_rgba(0,0,0,0.55)]
active:scale-[0.99]"
>
            Select track
          </label>

          <p className="text-xs mt-3 text-white/40">
            {file ? file.name : "No file selected"}
          </p>
        </motion.div>

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
  <motion.button
  onClick={runMaster}
  disabled={!file || step === "analyzing"}
  whileHover={file && step !== "analyzing" ? { scale: 1.02 } : undefined}
  whileTap={file && step !== "analyzing" ? { scale: 0.99 } : undefined}
  className="px-12 py-5 mt-6 text-xl font-semibold text-white rounded-xl bg-gradient-to-r from-purple-500 to-blue-500
shadow-[0_16px_55px_rgba(0,0,0,0.55)]
hover:brightness-110 hover:shadow-[0_22px_75px_rgba(0,0,0,0.62)]
transition-all duration-300
disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {step === "analyzing"
      ? "Mastering…"
      : "Master my track"}
  </motion.button>
)}

        {/* ANALYZING */}
        <AnimatePresence mode="wait">
        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-4"
          >
            <p className="text-sm text-white/75 font-mono tracking-tight">
  {displayText}<span className="animate-pulse text-purple-200">|</span>
</p>

            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-400/80 to-blue-400/80"
                animate={{ width: `${progress}%` }}
                transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        

        {/* RESULT */}
        <AnimatePresence mode="wait">
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="space-y-6"
          >

            <div className="bg-white/[0.06] p-6 rounded-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-[0_22px_70px_rgba(0,0,0,0.58)]">
              <p className="text-3xl font-bold 
bg-gradient-to-r from-white via-purple-200 to-blue-200 
bg-clip-text text-transparent 
drop-shadow-[0_0_14px_rgba(139,92,246,0.22)]">
  Your master is ready
</p>

<p className="text-sm text-white/50 mt-1">
  Industry-level master • Ready for release
</p>

  {masteredUrl && (
  <div className="mt-6 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl p-5 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-[0_22px_78px_rgba(0,0,0,0.62)]">

    <div className="grid grid-cols-2 gap-3">
      <motion.button
        type="button"
        onClick={() => selectSource("original")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
        className={
          selectedSource === "original"
            ? "py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600/75 to-blue-600/75 shadow-[0_0_14px_rgba(139,92,246,0.16)] ring-1 ring-white/10 hover:brightness-105 transition-all duration-300"
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
            ? "py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600/75 to-blue-600/75 shadow-[0_0_14px_rgba(59,130,246,0.15)] ring-1 ring-white/10 hover:brightness-105 transition-all duration-300"
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
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-full grid place-items-center text-white border border-white/10 overflow-hidden
bg-gradient-to-r from-purple-600/80 to-blue-600/80
shadow-[0_10px_30px_rgba(0,0,0,0.55)] hover:shadow-[0_14px_44px_rgba(0,0,0,0.62)]
hover:brightness-110 transition-all duration-300"
      >
        <span className="pointer-events-none absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
        <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_18px_rgba(139,92,246,0.14)]" />
        <span className="pointer-events-none absolute -inset-[2px] rounded-full bg-gradient-to-r from-purple-400/25 to-blue-400/22 blur-lg opacity-60" />
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
      <div className="pointer-events-none -mt-[6px] h-[6px] w-full shadow-[0_0_10px_rgba(139,92,246,0.10)]" />
    </div>

  {/* Hidden preloaded audio elements (avoid iOS src swapping issues) */}
  <audio
    ref={originalAudioRef}
    src={audioUrl}
    playsInline
    preload="auto"
    className="absolute w-0 h-0 opacity-0 pointer-events-none"
    onEnded={() => {
      pauseBoth()
      const el = originalAudioRef.current
      if (el) el.currentTime = safePreviewTimeForEl(el)
      setPlayProgress(0)
    }}
  />
  <audio
    ref={masteredAudioRef}
    src={masteredPreviewUrl}
    playsInline
    preload="auto"
    className="absolute w-0 h-0 opacity-0 pointer-events-none"
    onEnded={() => {
      pauseBoth()
      const el = masteredAudioRef.current
      if (el) el.currentTime = safePreviewTimeForEl(el)
      setPlayProgress(0)
    }}
  />

  {/* Mobile-only preview audio (single element, src swapped on play) */}
  <audio
    ref={mobileAudioRef}
    src={isMobileClient ? mobileSelectedUrl : ""}
    playsInline
    preload="auto"
    className="absolute w-0 h-0 opacity-0 pointer-events-none"
    onEnded={() => {
      const el = mobileAudioRef.current
      if (el) {
        el.pause()
        try {
          el.currentTime = PREVIEW_START
        } catch {}
      }
      setIsPlaying(false)
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
  onClick={() => {
    console.log("EXPORT URL:", masteredUrl ? `${masteredUrl}?download=1` : "")
  }}
>
  Download master 🎧
</a>
)}


</div>



            </div>

          </motion.div>
        )}
        </AnimatePresence>

      </div>

    </main>
  )
}