"use client"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion"
import {
  PREVIEW_DURATION,
  PREVIEW_END,
  PREVIEW_START,
  MOBILE_FADE_OUT_SECONDS,
  absoluteToElementTime,
  elementTimeToAbsolute,
  progressPercentFromAbsolute,
  type PreviewSource,
} from "../../lib/audioPreviewTimeline"
import { PUBLIC_BACKEND_API_BASE } from "../../lib/publicBackendUrl"

type Step = "upload" | "analyzing" | "done"

function stringField(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function objectKeyFromAfterPath(after: unknown): string {
  const raw = stringField(after).trim()
  if (!raw) return ""
  const match = raw.match(/^\/?masters\/([^?#]+)$/)
  return match?.[1] ?? ""
}

function objectKeyFromPlaybackUrl(url: string): string {
  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/masters\/([^?/#]+)/)
  const railwayMatch = url.match(/\/masters\/([^?/#]+)/)
  const key = signedMatch?.[1] ?? railwayMatch?.[1] ?? ""
  try {
    return key ? decodeURIComponent(key) : ""
  } catch {
    return key
  }
}

export default function FlowPage() {
  const API = PUBLIC_BACKEND_API_BASE
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
  const [masterObjectKey, setMasterObjectKey] = useState("")
  const [masterExpiresAt, setMasterExpiresAt] = useState("")
  const [deliveryEmail, setDeliveryEmail] = useState("")
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [deliverySending, setDeliverySending] = useState(false)
  const [deliveryError, setDeliveryError] = useState("")
  const [selectedSource, setSelectedSource] = useState<"original" | "mastered">("mastered")
  const [isPaid, setIsPaid] = useState(false)

  const [step, setStep] = useState<Step>("upload")
  const [aiText, setAiText] = useState("")
  const [progress, setProgress] = useState(0)
  
  const [loadingMaster, setLoadingMaster] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)

  const selectedSourceRef = useRef<"original" | "mastered">("mastered")
  const sharedTimelineSecRef = useRef(PREVIEW_START)
  const isSwappingMobileSourceRef = useRef(false)
  /** Desktop only: ignore stacked Play taps until the current play() settles */
  const isStartingPlaybackRef = useRef(false)

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
 

  const AI_STATUS = [
    "Initializing mastering engine",
    "Balancing low-end",
    "Enhancing stereo image",
    "Optimizing loudness",
    "Controlling dynamics",
    "Finalizing master",
  ]

  const applyTimelineToElement = (
    el: HTMLAudioElement | null,
    source: PreviewSource,
    absoluteSec: number,
    isMobilePlayback: boolean
  ) => {
    if (!el) return
    try {
      el.currentTime = absoluteToElementTime(source, absoluteSec, {
        duration: el.duration,
        isMobile: isMobilePlayback,
      })
    } catch {
      /* ignore */
    }
  }

  const syncDesktopElementsToTimeline = (absoluteSec: number) => {
    applyTimelineToElement(originalAudioRef.current, "original", absoluteSec, false)
    applyTimelineToElement(masteredAudioRef.current, "mastered", absoluteSec, false)
  }

  const captureTimelineFromActive = (source: PreviewSource) => {
    if (isMobileClient) {
      const el = mobileAudioRef.current
      if (!el) return sharedTimelineSecRef.current
      return elementTimeToAbsolute(source, el.currentTime, true)
    }
    const el =
      source === "mastered" ? masteredAudioRef.current : originalAudioRef.current
    if (!el) return sharedTimelineSecRef.current
    return elementTimeToAbsolute(source, el.currentTime, false)
  }

  const resetBothToPreviewStart = () => {
    sharedTimelineSecRef.current = PREVIEW_START
    syncDesktopElementsToTimeline(PREVIEW_START)
    const mobile = mobileAudioRef.current
    if (mobile) applyTimelineToElement(mobile, selectedSourceRef.current, PREVIEW_START, true)
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

  // ---------------- FILE ----------------
  const handleFile = (e: any) => {
  const selected = e.target.files[0]
  if (!selected) return

  setFile(selected)
  setAudioUrl(URL.createObjectURL(selected))
  setMasteredUrl("")
  setMasteredPreviewMp3Url("")
  setMasterObjectKey("")
  setMasterExpiresAt("")
  
  setStep("upload")
  setIsPaid(false)
}

  const handleDrop = (file: File) => {
  setFile(file)
  setAudioUrl(URL.createObjectURL(file))
  setMasteredUrl("")
  setMasteredPreviewMp3Url("")
  setMasterObjectKey("")
  setMasterExpiresAt("")
  
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

      const masterUrl = `${API}/master`
      const res = await axios.post(masterUrl, formData)

const mastered =
  res.data.afterUrl ||
  res.data.fullUrl ||
  (res.data.after ? `${API}${res.data.after}` : "")

setMasteredUrl(mastered)

const previewMp3 =
  res.data.previewAfterMp3Url ||
  (res.data.previewAfterMp3 ? `${API}${res.data.previewAfterMp3}` : "")
setMasteredPreviewMp3Url(previewMp3)
setMasterObjectKey(
  stringField(res.data.objectKey) ||
  stringField(res.data.object_key) ||
  stringField(res.data.pipelineDebug?.objectKey) ||
  objectKeyFromAfterPath(res.data.after)
)
setMasterExpiresAt(
  stringField(res.data.expiresAt) ||
  stringField(res.data.expires_at) ||
  stringField(res.data.pipelineDebug?.expiresAt)
)

setSelectedSource("mastered")

} catch (err) {
  console.error("Auto master failed:", err)
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
    console.error("Mastering failed:", err)
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
        if (isSelected() && !el.paused) return
        applyTimelineToElement(el, label, sharedTimelineSecRef.current, false)
      }

      const onTimeUpdate = () => {
        if (!isSelected()) return
        const abs = elementTimeToAbsolute(label, el.currentTime, false)
        if (Number.isFinite(abs) && abs >= PREVIEW_END) {
          pauseBoth()
          resetBothToPreviewStart()
          setIsPlaying(false)
          setPlayProgress(0)
          return
        }
        sharedTimelineSecRef.current = abs
        setPlayProgress(progressPercentFromAbsolute(abs))
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
      if (isSwappingMobileSourceRef.current) return
      el.volume = 1
      applyTimelineToElement(el, selectedSourceRef.current, sharedTimelineSecRef.current, true)
    }

    const onTimeUpdate = () => {
      const source = selectedSourceRef.current
      const abs = elementTimeToAbsolute(source, el.currentTime, true)

      if (Number.isFinite(abs) && abs >= PREVIEW_END - MOBILE_FADE_OUT_SECONDS && abs < PREVIEW_END) {
        const remaining = PREVIEW_END - abs
        el.volume = Math.max(0, Math.min(1, remaining / MOBILE_FADE_OUT_SECONDS))
      } else {
        el.volume = 1
      }

      if (Number.isFinite(abs) && abs >= PREVIEW_END) {
        el.pause()
        sharedTimelineSecRef.current = PREVIEW_START
        applyTimelineToElement(el, source, PREVIEW_START, true)
        el.volume = 1
        setIsPlaying(false)
        setPlayProgress(0)
        return
      }

      sharedTimelineSecRef.current = abs
      setPlayProgress(progressPercentFromAbsolute(abs))
    }

    el.addEventListener("loadedmetadata", onReady)
    el.addEventListener("canplay", onReady)
    el.addEventListener("timeupdate", onTimeUpdate)
    return () => {
      el.removeEventListener("loadedmetadata", onReady)
      el.removeEventListener("canplay", onReady)
      el.removeEventListener("timeupdate", onTimeUpdate)
    }
  }, [isMobileClient, selectedSource, mobileSelectedUrl])

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

const handlePayment = () => {
  setDeliveryOpen(true)
  setDeliveryError("")
}

const handleEmailDelivery = async () => {
  const email = deliveryEmail.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setDeliveryError("Enter a valid email address.")
    return
  }
  const deliveryObjectKey = masterObjectKey || objectKeyFromPlaybackUrl(masteredUrl)
  if (!masteredUrl || !deliveryObjectKey) {
    setDeliveryError("Master delivery link is not ready yet.")
    return
  }

  setDeliverySending(true)
  setDeliveryError("")
  try {
    const res = await fetch(`${API}/master/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        objectKey: deliveryObjectKey,
        playbackUrl: masteredUrl,
        expiresAt: masterExpiresAt || null,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || "Could not send email")
    }
    setIsPaid(true)
    setDeliveryOpen(false)
  } catch (err) {
    setDeliveryError(err instanceof Error ? err.message : "Could not send email. Please try again.")
  } finally {
    setDeliverySending(false)
  }
}

  // (metadata sync handled in the preview enforcement effect above)


  useEffect(() => {
  if (!masteredUrl) return

  // Default to AFTER when master becomes available
  if (step === "done") setSelectedSource("mastered")
}, [masteredUrl, step])

  const selectSource = async (next: "original" | "mastered") => {
    if (next === "mastered" && !masteredUrl) return
    if (next === "original" && !audioUrl) return
    if (next === selectedSource) return

    const wasPlaying = isMobileClient
      ? !mobileAudioRef.current?.paused
      : !(selectedSource === "mastered"
          ? masteredAudioRef.current
          : originalAudioRef.current)?.paused

    const abs = captureTimelineFromActive(selectedSource)
    sharedTimelineSecRef.current = abs
    setPlayProgress(progressPercentFromAbsolute(abs))

    if (isMobileClient) {
      const el = mobileAudioRef.current
      const nextSrc = next === "mastered" ? masteredMobilePreviewUrl : audioUrl
      pauseAll()
      setSelectedSource(next)
      if (!el || !nextSrc) return
      isSwappingMobileSourceRef.current = true
      try {
        if (el.src !== nextSrc) {
          el.pause()
          el.src = nextSrc
          el.load()
          await waitForReady(el)
        }
        applyTimelineToElement(el, next, abs, true)
        if (wasPlaying) {
          try {
            await el.play()
            setIsPlaying(true)
          } catch {
            setIsPlaying(false)
          }
        }
      } finally {
        isSwappingMobileSourceRef.current = false
      }
      return
    }

    pauseAll()
    syncDesktopElementsToTimeline(abs)
    setSelectedSource(next)
    if (wasPlaying) {
      const playEl = next === "mastered" ? masteredAudioRef.current : originalAudioRef.current
      if (playEl) {
        try {
          await playEl.play()
          setIsPlaying(true)
        } catch {
          setIsPlaying(false)
        }
      }
    }
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

    // Before playing selected ref: pause only the other desktop element (never the one we're about to play).
    otherEl?.pause()

    if (isMobileClient) {
      setIsPlaying(false)
      const el = mobileAudioRef.current
      if (!el) return
      const nextSrc = mobileSelectedUrl
      if (!nextSrc) return

      // MOBILE deterministic flow (single audio element)
      el.pause()
      if (el.src !== nextSrc) el.src = nextSrc
      el.load()
      await waitForReady(el)
      applyTimelineToElement(el, selectedSource, sharedTimelineSecRef.current, true)
      el.volume = 1
      setPlayProgress(progressPercentFromAbsolute(sharedTimelineSecRef.current))
      try {
        await el.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
      return
    }

    if (isStartingPlaybackRef.current) return
    isStartingPlaybackRef.current = true

    try {
      // DESKTOP flow (two audio elements already in DOM)
      // Desktop MASTERED must use the WAV master URL (afterUrl/fullUrl).
      if (selectedSourceRef.current === "mastered") {
        if (!masteredUrl || !/^https:\/\//i.test(masteredUrl)) {
          setIsPlaying(false)
          return
        }

        const originalEl = originalAudioRef.current
        originalEl?.pause()

        const masteredEl = masteredAudioRef.current
        if (masteredEl) {
          if (masteredEl.src !== masteredUrl) {
            masteredEl.src = masteredUrl
            masteredEl.load()
          }
          await waitForReady(masteredEl)
          applyTimelineToElement(masteredEl, "mastered", sharedTimelineSecRef.current, false)
          setPlayProgress(progressPercentFromAbsolute(sharedTimelineSecRef.current))
          try {
            await masteredEl.play()
            setIsPlaying(true)
          } catch {
            setIsPlaying(false)
          }
        }
        return
      }

      // Desktop ORIGINAL
      masteredAudioRef.current?.pause()
      selectedEl.load()
      await waitForReady(selectedEl)
      applyTimelineToElement(selectedEl, "original", sharedTimelineSecRef.current, false)
      setPlayProgress(progressPercentFromAbsolute(sharedTimelineSecRef.current))
      try {
        await selectedEl.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    } finally {
      isStartingPlaybackRef.current = false
    }
  }
  

  // ---------------- UI ----------------

  if (!mounted) return null

  return (
    <main className="min-h-screen flex items-start justify-center px-6 pb-8 pt-12 text-white relative overflow-hidden bg-black md:pt-14">

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

          <p className="text-xs mt-3 text-white/70">
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
    <p className="text-xs text-white/70">
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

{deliveryOpen && (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 px-5 backdrop-blur-md">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#090912] p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/58">Master delivery</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Secure your master link</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/68">
        Enter your email to receive your mastered track and secure download link. You can reopen it later from any
        device, even if this page is closed.
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-white/48">
        We send the link instantly and only use it to deliver this export.
      </p>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={deliveryEmail}
        onChange={(e) => setDeliveryEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/34 focus:border-violet-300/36"
      />
      {deliveryError ? <p className="mt-2 text-xs text-rose-300/85">{deliveryError}</p> : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleEmailDelivery}
          disabled={deliverySending}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deliverySending ? "Sending…" : "Email my master"}
        </button>
        <button
          type="button"
          onClick={() => setDeliveryOpen(false)}
          disabled={deliverySending}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white/76 transition hover:bg-white/[0.055]"
        >
          Not now
        </button>
      </div>
    </div>
  </div>
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
            <p className="min-h-[1.35rem] text-sm text-white/75 font-mono tracking-tight">
  {displayText || "\u00a0"}
  <span className="animate-pulse text-purple-200">|</span>
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
      if (el) applyTimelineToElement(el, "original", PREVIEW_START, false)
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
      if (el) applyTimelineToElement(el, "mastered", PREVIEW_START, false)
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


      <p className="text-xs text-white/70 mt-2 text-center">
  Ready for release • Instant download
</p>
    </button>

    
  </>
)}

{/* Delivery confirmation */}
{isPaid && (
  <div
  className="block w-full py-5 mt-4 rounded-xl text-lg font-bold text-white text-center cursor-pointer
bg-gradient-to-r from-purple-500 to-blue-500
shadow-[0_0_40px_rgba(139,92,246,0.35)]
hover:brightness-110 hover:scale-[1.02]
active:scale-[0.98]
transition-all duration-300"
>
  Check your inbox
</div>
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