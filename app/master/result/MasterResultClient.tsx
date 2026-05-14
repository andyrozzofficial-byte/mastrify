"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useMasterSession, type MasterStylePreset } from "../MasterSessionProvider"

const PREVIEW_START = 60
const PREVIEW_DURATION = 30
const PREVIEW_END = PREVIEW_START + PREVIEW_DURATION
const MOBILE_MASTERED_DURATION = 30
const MOBILE_FADE_OUT_SECONDS = 3

const STYLE_LABELS: Record<MasterStylePreset, string> = {
  STREAM: "Balanced",
  WARM: "Warm",
  LOUD: "Punchy",
  CLUB: "Club",
  FESTIVAL: "Open",
}

const LOUDNESS_OPTIONS = [
  { lufs: -14, label: "Streaming" },
  { lufs: -13, label: "YouTube" },
  { lufs: -11, label: "Spotify Loud" },
  { lufs: -9, label: "CD / Club" },
]

function loudnessLabel(lufs: number): string {
  const row = LOUDNESS_OPTIONS.find((r) => r.lufs === lufs)
  return row ? `${row.label} (${lufs} LUFS)` : `${lufs} LUFS`
}

function formatLufs(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(1)
  return "—"
}

function formatDr(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(1)
  return "—"
}

function formatPct(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return `${Math.round(v * 100)}%`
  return "—"
}

function clarityWord(a: Record<string, unknown> | null | undefined): string {
  if (!a) return "—"
  const b = typeof a.brightness === "number" ? a.brightness : 0
  const s = typeof a.stereoWidth === "number" ? a.stereoWidth : 0
  const blend = b * 0.55 + s * 0.45
  if (blend < 0.22) return "Low"
  if (blend < 0.42) return "Medium"
  return "High"
}

function fmtClock(sec: number): string {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, "0")}`
}

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
    analysisBefore,
    analysisAfter,
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
      if (navigator.share) {
        await navigator.share({ title: "Mastrify", text: "Listen to my master on Mastrify", url })
      } else {
        await navigator.clipboard.writeText(url)
      }
      setShareLabel("Copied")
      setTimeout(() => setShareLabel("Share"), 2000)
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        setShareLabel("Copied")
        setTimeout(() => setShareLabel("Share"), 2000)
      } catch {
        setShareLabel("Copy failed")
        setTimeout(() => setShareLabel("Share"), 2000)
      }
    }
  }

  const windowStart = isMobileClient && selectedSource === "mastered" ? 0 : PREVIEW_START
  const windowLen = isMobileClient && selectedSource === "mastered" ? MOBILE_MASTERED_DURATION : PREVIEW_DURATION
  const playHeadSec = windowStart + (playProgress / 100) * windowLen
  const windowEndSec = windowStart + windowLen

  const afterLufsDisplay =
    analysisAfter && typeof analysisAfter.lufs === "number" && Number.isFinite(analysisAfter.lufs as number)
      ? formatLufs(analysisAfter.lufs)
      : formatLufs(targetLufs)

  const metricRows = [
    { label: "LUFS", before: formatLufs(analysisBefore?.lufs), after: afterLufsDisplay },
    { label: "Dynamic range", before: formatDr(analysisBefore?.dynamicRange), after: formatDr(analysisAfter?.dynamicRange) },
    { label: "Stereo width", before: formatPct(analysisBefore?.stereoWidth), after: formatPct(analysisAfter?.stereoWidth) },
    { label: "Clarity", before: clarityWord(analysisBefore), after: clarityWord(analysisAfter) },
    { label: "Low end", before: formatPct(analysisBefore?.bassWeight), after: formatPct(analysisAfter?.bassWeight) },
    { label: "Highs", before: formatPct(analysisBefore?.brightness), after: formatPct(analysisAfter?.brightness) },
  ]

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
    <div className="mx-auto w-full max-w-5xl px-5 pb-28 pt-12 md:px-8 md:pb-32 md:pt-16 lg:max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem] md:text-[2.25rem]">
          Your master is ready! 🎉
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-white/40 md:text-sm">Here&apos;s how your track improved.</p>
        {file?.name ? <p className="mt-2 text-[11px] text-white/28">{file.name}</p> : null}
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
        className="mt-12 rounded-[1.35rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-black/[0.52] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:mt-14 md:rounded-3xl md:p-10 lg:p-11"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12">
          {/* Before / After metrics */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/32">Comparison</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06]">
              <table className="w-full border-collapse text-left text-[13px] md:text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-black/[0.35]">
                    <th className="px-4 py-3 font-semibold text-white/35 md:px-5" />
                    <th className="px-4 py-3 font-semibold text-white/45 md:px-5">Before</th>
                    <th className="px-4 py-3 font-semibold text-emerald-300/85 md:px-5">After</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr key={row.label} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-4 py-3.5 font-medium text-white/55 md:px-5">{row.label}</td>
                      <td className="px-4 py-3.5 tabular-nums text-white/32 md:px-5">{row.before}</td>
                      <td className="px-4 py-3.5 tabular-nums font-medium text-emerald-300/[0.88] md:px-5">{row.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview + settings */}
          <div className="flex min-w-0 flex-col gap-5">
            <div className="rounded-xl border border-white/[0.07] bg-black/[0.4] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6">
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/32">Mastering preview</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectSource("original")}
                  className={`rounded-lg py-2.5 text-xs font-semibold transition ${
                    selectedSource === "original"
                      ? "bg-gradient-to-r from-violet-600/85 to-indigo-600/85 text-white shadow-[0_0_16px_rgba(99,102,241,0.18)] ring-1 ring-white/[0.08]"
                      : "border border-white/[0.08] bg-white/[0.04] text-white/55 hover:bg-white/[0.07]"
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => selectSource("mastered")}
                  className={`rounded-lg py-2.5 text-xs font-semibold transition ${
                    selectedSource === "mastered"
                      ? "bg-gradient-to-r from-violet-600/85 to-indigo-600/85 text-white shadow-[0_0_16px_rgba(99,102,241,0.18)] ring-1 ring-white/[0.08]"
                      : "border border-white/[0.08] bg-white/[0.04] text-white/55 hover:bg-white/[0.07]"
                  }`}
                >
                  Mastered
                </button>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-white/[0.05]">
                <div className="flex h-12 items-end justify-center gap-px px-3 pt-3 opacity-[0.38]">
                  {Array.from({ length: 72 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-full bg-gradient-to-t from-violet-500/35 to-sky-400/45"
                      style={{ height: `${22 + (i % 6) * 10}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_0_18px_rgba(99,102,241,0.22)] ring-1 ring-white/10 transition hover:brightness-110"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <span className="flex gap-0.5">
                      <span className="block h-3.5 w-1 rounded-sm bg-white" />
                      <span className="block h-3.5 w-1 rounded-sm bg-white" />
                    </span>
                  ) : (
                    <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[11px] tabular-nums text-white/38">
                    <span>
                      {fmtClock(playHeadSec)} / {fmtClock(windowEndSec)}
                    </span>
                    <button type="button" className="rounded p-1 text-white/30 hover:text-white/50" aria-label="Expand preview">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400/90 to-sky-400/85"
                      style={{ width: `${playProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/[0.35] px-4 py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/32">Mastering style</p>
                <p className="mt-1.5 text-sm font-medium text-cyan-200/85">{STYLE_LABELS[stylePreset]}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/[0.35] px-4 py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/32">Loudness target</p>
                <p className="mt-1.5 text-sm font-medium text-cyan-200/85">{loudnessLabel(targetLufs)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-3 sm:mt-12 sm:flex-row sm:justify-center sm:gap-4"
      >
        {!isPaid ? (
          <button
            type="button"
            onClick={handlePayment}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#4f46e5] to-[#2563eb] px-8 text-[14px] font-semibold text-white shadow-[0_0_22px_rgba(99,102,241,0.2),0_12px_36px_rgba(0,0,0,0.42)] ring-1 ring-white/10 transition hover:brightness-110"
          >
            Unlock download
          </button>
        ) : (
          <a
            href={masteredUrl ? `${masteredUrl}?download=1` : "#"}
            download="master.wav"
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#4f46e5] to-[#2563eb] px-8 text-[14px] font-semibold text-white shadow-[0_0_22px_rgba(99,102,241,0.2),0_12px_36px_rgba(0,0,0,0.42)] ring-1 ring-white/10 transition hover:brightness-110"
          >
            Download master
          </a>
        )}
        <Link
          href="/master"
          onClick={() => resetSession()}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-8 text-[14px] font-semibold text-white/88 transition hover:border-white/[0.18] hover:bg-white/[0.07]"
        >
          New master
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mx-auto mt-14 max-w-md text-center md:mt-16"
      >
        <p className="text-[13px] text-white/38">Happy with the result? Share your master!</p>
        <button
          type="button"
          onClick={handleShare}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-black/[0.35] px-5 py-2 text-[12px] font-medium text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/90"
        >
          <svg className="h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z" />
          </svg>
          {shareLabel}
        </button>
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
