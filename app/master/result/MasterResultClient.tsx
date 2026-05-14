"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useMasterSession } from "../MasterSessionProvider"

const PREVIEW_START = 60
const PREVIEW_DURATION = 30
const PREVIEW_END = PREVIEW_START + PREVIEW_DURATION
const MOBILE_MASTERED_DURATION = 30
const MOBILE_FADE_OUT_SECONDS = 3

function isIOSSafari() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1)
  if (!isIOS) return false
  const isWebKit = /WebKit/i.test(ua)
  const isCriOS = /CriOS/i.test(ua)
  const isFxiOS = /FxiOS/i.test(ua)
  return isWebKit && !isCriOS && !isFxiOS
}

function isAbortError(e: unknown) {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  )
}

export default function MasterResultClient() {
  const {
    file,
    audioUrl,
    masteredUrl,
    masteredPreviewMp3Url,
    targetLufs,
    stylePreset,
    resetSession,
  } = useMasterSession()

  const [mounted, setMounted] = useState(false)
  const [isMobileClient, setIsMobileClient] = useState(false)
  const [mobileAudioKey, setMobileAudioKey] = useState(0)
  const [selectedSource, setSelectedSource] = useState<"original" | "mastered">("mastered")
  const [isPlaying, setIsPlaying] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)
  const [isPaid, setIsPaid] = useState(false)
  const [shareLabel, setShareLabel] = useState("Share")

  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null)
  const mobileAudioRef = useRef<HTMLAudioElement | null>(null)
  const selectedSourceRef = useRef(selectedSource)
  const isStartingPlaybackRef = useRef(false)

  useEffect(() => {
    selectedSourceRef.current = selectedSource
  }, [selectedSource])

  useEffect(() => {
    setMounted(true)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
    setIsMobileClient(/iPhone|iPad|iPod|Android|Mobile/i.test(ua))
    setIsPaid(typeof window !== "undefined" && localStorage.getItem("paid") === "true")
  }, [])

  const masteredPreviewUrl = isIOSSafari() && masteredPreviewMp3Url ? masteredPreviewMp3Url : masteredUrl
  const masteredMobilePreviewUrl = masteredPreviewMp3Url || ""
  const mobileSelectedUrl = selectedSource === "mastered" ? masteredMobilePreviewUrl : audioUrl

  const safePreviewTimeForEl = (el: HTMLAudioElement | null) => {
    const dur = el?.duration
    if (el && Number.isFinite(dur) && dur! > 0) {
      return Math.min(PREVIEW_START, Math.max(0, dur! - 0.1))
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
    originalAudioRef.current?.pause()
    masteredAudioRef.current?.pause()
    setIsPlaying(false)
  }

  const pauseAll = () => {
    pauseBoth()
    mobileAudioRef.current?.pause()
    setIsPlaying(false)
  }

  const waitForReady = (el: HTMLAudioElement) => {
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

  useEffect(() => {
    if (isMobileClient) return
    const original = originalAudioRef.current
    const mastered = masteredAudioRef.current
    if (!original || !mastered) return

    const attach = (el: HTMLAudioElement, label: "original" | "mastered") => {
      const isSelected = () => selectedSourceRef.current === label

      const onReady = () => {
        if (isSelected() && !el.paused) return
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

    const d1 = attach(original, "original")
    const d2 = attach(mastered, "mastered")
    return () => {
      d1()
      d2()
    }
  }, [audioUrl, masteredPreviewUrl, isMobileClient])

  useEffect(() => {
    if (!isMobileClient) return
    const el = mobileAudioRef.current
    if (!el) return

    const onReady = () => {
      el.volume = 1
      try {
        el.currentTime = selectedSource === "mastered" ? 0 : PREVIEW_START
      } catch {}
    }

    const onTimeUpdate = () => {
      const t = el.currentTime
      const isMastered = selectedSource === "mastered"
      const end = isMastered ? MOBILE_MASTERED_DURATION : PREVIEW_END
      const start = isMastered ? 0 : PREVIEW_START
      const duration = isMastered ? MOBILE_MASTERED_DURATION : PREVIEW_DURATION

      if (Number.isFinite(t) && t >= end - MOBILE_FADE_OUT_SECONDS && t < end) {
        const remaining = end - t
        el.volume = Math.max(0, Math.min(1, remaining / MOBILE_FADE_OUT_SECONDS))
      } else {
        el.volume = 1
      }

      if (Number.isFinite(t) && t >= end) {
        el.pause()
        try {
          el.currentTime = start
        } catch {}
        el.volume = 1
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
  }, [isMobileClient, selectedSource, mobileAudioKey])

  const selectSource = (next: "original" | "mastered") => {
    if (next === "mastered" && !masteredUrl) return
    if (next === "original" && !audioUrl) return
    if (next === selectedSource) return
    pauseAll()
    setPlayProgress(0)
    if (isMobileClient) setMobileAudioKey((k) => k + 1)
    setSelectedSource(next)
  }

  const togglePlayPause = async () => {
    const selectedEl = isMobileClient
      ? mobileAudioRef.current
      : selectedSource === "mastered"
        ? masteredAudioRef.current
        : originalAudioRef.current
    if (!selectedEl) return

    if (!selectedEl.paused) {
      pauseAll()
      return
    }

    const otherEl = !isMobileClient
      ? selectedSource === "mastered"
        ? originalAudioRef.current
        : masteredAudioRef.current
      : null
    otherEl?.pause()

    if (isMobileClient) {
      setIsPlaying(false)
      const el = mobileAudioRef.current
      if (!el) return
      const nextSrc = mobileSelectedUrl
      if (!nextSrc) return
      el.pause()
      if (el.src !== nextSrc) el.src = nextSrc
      el.load()
      await waitForReady(el)
      const isMastered = selectedSource === "mastered"
      try {
        el.currentTime = isMastered ? 0 : PREVIEW_START
      } catch {}
      el.volume = 1
      setPlayProgress(0)
      try {
        await el.play()
        setIsPlaying(true)
      } catch (e) {
        if (!isAbortError(e)) console.log("AUDIO PLAY FAILED:", e)
        setIsPlaying(false)
      }
      return
    }

    if (isStartingPlaybackRef.current) return
    isStartingPlaybackRef.current = true
    try {
      if (selectedSourceRef.current === "mastered") {
        if (!masteredUrl || !/^https:\/\//i.test(masteredUrl)) {
          setIsPlaying(false)
          return
        }
        originalAudioRef.current?.pause()
        const masteredEl = masteredAudioRef.current
        if (masteredEl) {
          if (masteredEl.src !== masteredUrl) {
            masteredEl.src = masteredUrl
            masteredEl.load()
          }
          await waitForReady(masteredEl)
          try {
            masteredEl.currentTime = safePreviewTimeForEl(masteredEl)
          } catch {}
          setPlayProgress(0)
          try {
            await masteredEl.play()
            setIsPlaying(true)
          } catch (e) {
            if (!isAbortError(e)) console.log("play error", e)
            setIsPlaying(false)
          }
        }
        return
      }
      masteredAudioRef.current?.pause()
      selectedEl.load()
      await waitForReady(selectedEl)
      try {
        selectedEl.currentTime = safePreviewTimeForEl(selectedEl)
      } catch {}
      setPlayProgress(0)
      try {
        await selectedEl.play()
        setIsPlaying(true)
      } catch (e) {
        if (!isAbortError(e)) console.log("AUDIO PLAY FAILED:", e)
        setIsPlaying(false)
      }
    } finally {
      isStartingPlaybackRef.current = false
    }
  }

  const handlePayment = () => {
    localStorage.setItem("paid", "true")
    setIsPaid(true)
  }

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      await navigator.clipboard.writeText(url)
      setShareLabel("Copied")
      setTimeout(() => setShareLabel("Share"), 2000)
    } catch {
      setShareLabel("Copy failed")
      setTimeout(() => setShareLabel("Share"), 2000)
    }
  }

  if (!mounted) return null

  if (!masteredUrl) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center text-white/60">
        <p>No master in this session.</p>
        <Link href="/master" className="mt-4 inline-block text-purple-300 hover:underline">
          Start a new master
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-10 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-black/45 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_32px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-10"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/70">Complete</p>
        <h1 className="mt-3 text-center text-2xl font-bold tracking-tight text-transparent bg-gradient-to-r from-white via-purple-100 to-cyan-100 bg-clip-text md:text-3xl">
          Your master is ready
        </h1>
        <p className="mt-2 text-center text-sm text-white/45">{file?.name ?? "Track"}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/12 bg-black/35 p-5 shadow-inner">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Before</p>
            <p className="mt-2 text-lg font-semibold text-white/90">Upload</p>
            <p className="mt-2 text-sm text-white/45">Preview 60s–90s window</p>
          </div>
          <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">After</p>
            <p className="mt-2 text-lg font-semibold text-white">Mastered</p>
            <p className="mt-2 text-sm text-white/55">
              {targetLufs} LUFS target · {stylePreset}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-black/45 p-6 md:p-8">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Waveform preview</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectSource("original")}
              className={`rounded-lg py-2.5 text-xs font-bold ${
                selectedSource === "original"
                  ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white ring-1 ring-white/10"
                  : "border border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
              }`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => selectSource("mastered")}
              className={`rounded-lg py-2.5 text-xs font-bold ${
                selectedSource === "mastered"
                  ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white ring-1 ring-white/10"
                  : "border border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
              }`}
            >
              Mastered
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={togglePlayPause}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <span className="flex gap-0.5">
                  <span className="block h-4 w-1 rounded-sm bg-white" />
                  <span className="block h-4 w-1 rounded-sm bg-white" />
                </span>
              ) : (
                <svg className="ml-0.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-400 to-cyan-400"
              style={{ width: `${playProgress}%` }}
            />
          </div>
          <div className="relative mt-4 flex h-14 items-center justify-center overflow-hidden rounded-lg bg-white/[0.04]">
            <div className="flex h-8 w-full items-end justify-center gap-px px-4 opacity-40">
              {Array.from({ length: 80 }).map((_, i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-full bg-gradient-to-t from-purple-500/40 to-cyan-400/60"
                  style={{ height: `${20 + (i % 5) * 12}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {!isPaid ? (
            <button
              type="button"
              onClick={handlePayment}
              className="flex-1 rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-cyan-500 py-4 text-base font-bold text-white shadow-[0_20px_50px_rgba(139,92,246,0.35)] transition hover:brightness-110"
            >
              Unlock download
            </button>
          ) : (
            <a
              href={masteredUrl ? `${masteredUrl}?download=1` : "#"}
              download="master.wav"
              className="flex-1 rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-cyan-500 py-4 text-center text-base font-bold text-white shadow-[0_20px_50px_rgba(139,92,246,0.35)] transition hover:brightness-110"
            >
              Download master
            </a>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="rounded-2xl border border-white/18 bg-white/[0.06] px-6 py-4 text-base font-semibold text-white/90 transition hover:border-cyan-400/35 hover:bg-white/[0.1]"
          >
            {shareLabel}
          </button>
        </div>

        <Link
          href="/master"
          onClick={() => resetSession()}
          className="mt-6 block text-center text-xs text-white/40 hover:text-white/70"
        >
          New master
        </Link>
      </motion.div>

      <audio ref={originalAudioRef} src={audioUrl} playsInline preload="auto" className="hidden" />
      <audio ref={masteredAudioRef} src={masteredPreviewUrl} playsInline preload="auto" className="hidden" />
      <audio
        ref={mobileAudioRef}
        key={mobileAudioKey}
        src={isMobileClient ? mobileSelectedUrl : ""}
        playsInline
        preload="auto"
        className="hidden"
      />
    </div>
  )
}
