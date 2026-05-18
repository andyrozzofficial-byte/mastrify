"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  MASTRIFY_CLIENT_LUFS_TRACE,
  MASTRIFY_CLIENT_PIPELINE_DEBUG,
  MASTRIFY_CLIENT_PREVIEW_DEBUG,
} from "../../../lib/mastrifyDebug"
import { useMasterSession, type MasterStylePreset } from "../MasterSessionProvider"
import {
  adaptiveDetailLines,
  adaptiveStatusMessage,
  approximateLufsLabel,
  buildMasterDescriptor,
  buildQualityMetricRows,
  buildQualityTags,
  mergeInsightsFromAnalysis,
  smartLoudnessSubtitle,
  smartLoudnessTitle,
  toFiniteNumber,
} from "../../../lib/masterResultInsights"
import {
  PREVIEW_DURATION,
  PREVIEW_END,
  PREVIEW_START,
  MOBILE_FADE_OUT_SECONDS,
  absoluteFromProgressPercent,
  absoluteToElementTime,
  elementTimeToAbsolute,
  progressPercentFromAbsolute,
  type PreviewSource,
} from "../../../lib/audioPreviewTimeline"
import { parseTrackDisplayName } from "../../../lib/parseTrackDisplayName"
import CinematicWaveform from "../../components/audio/CinematicWaveform"

const STYLE_LABELS: Record<MasterStylePreset, string> = {
  STREAM: "Balanced",
  WARM: "Warm",
  LOUD: "Punchy",
  CLUB: "Club",
  FESTIVAL: "Open",
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

/** Non-empty playback URL only — never pass "" to <audio src>. */
function normalizePlaybackUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

function isPlayableMediaUrl(url: string | null): url is string {
  if (!url) return false
  return /^https?:\/\//i.test(url) || url.startsWith("blob:")
}

function logPreview(message: string, detail?: Record<string, unknown>) {
  if (!MASTRIFY_CLIENT_PREVIEW_DEBUG) return
  if (detail) console.log(`[preview] ${message}`, detail)
  else console.log(`[preview] ${message}`)
}

function resolveMasteredPlaybackUrl(mp3: string | null, wav: string | null): { url: string | null; via: "mp3" | "wav" | null } {
  if (mp3) return { url: mp3, via: "mp3" }
  if (wav) return { url: wav, via: "wav" }
  return { url: null, via: null }
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
  const [selectedSource, setSelectedSource] = useState<"original" | "mastered">("mastered")
  const [isPlaying, setIsPlaying] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)
  const [isPaid, setIsPaid] = useState(false)
  const [shareLabel, setShareLabel] = useState("Share")

  const originalAudioRef = useRef<HTMLAudioElement | null>(null)
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null)
  const mobileAudioRef = useRef<HTMLAudioElement | null>(null)
  const selectedSourceRef = useRef(selectedSource)
  const sharedTimelineSecRef = useRef(PREVIEW_START)
  const isStartingPlaybackRef = useRef(false)
  const isSwappingMobileSourceRef = useRef(false)

  useEffect(() => {
    selectedSourceRef.current = selectedSource
  }, [selectedSource])

  useEffect(() => {
    if (!MASTRIFY_CLIENT_PIPELINE_DEBUG) return
    console.log("[pipeline] MasterResultClient state", {
      masteredUrl,
      stylePreset,
      targetLufs,
      analysisAfter,
      display: {
        lufsAfter: toFiniteNumber(analysisAfter?.lufs),
        dynamicRange: toFiniteNumber(analysisAfter?.dynamicRange),
        stereoWidth: toFiniteNumber(analysisAfter?.stereoWidth),
        bassWeight: toFiniteNumber(analysisAfter?.bassWeight),
        brightness: toFiniteNumber(analysisAfter?.brightness),
      },
    })
  }, [masteredUrl, analysisAfter, stylePreset, targetLufs])

  useEffect(() => {
    if (!MASTRIFY_CLIENT_LUFS_TRACE) return
    const measured = toFiniteNumber(analysisAfter?.lufs)
    const displayStr = measured !== null ? measured.toFixed(1) : "—"
    console.log("[LUFS_TRACE] AUTHORITY_UI_RESULT_PAGE", {
      analysisAfterLufsRaw: analysisAfter?.lufs,
      parsedForDisplay: measured,
      metricRowAfterString: displayStr,
      sessionTargetLufs: targetLufs,
    })
  }, [analysisAfter, targetLufs])

  useEffect(() => {
    setMounted(true)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
    setIsMobileClient(/iPhone|iPad|iPod|Android|Mobile/i.test(ua))
    setIsPaid(typeof window !== "undefined" && localStorage.getItem("paid") === "true")
  }, [])

  const originalPreviewUrl = useMemo(() => normalizePlaybackUrl(audioUrl), [audioUrl])
  const masteredWavUrl = useMemo(() => normalizePlaybackUrl(masteredUrl), [masteredUrl])
  const masteredMp3Url = useMemo(() => normalizePlaybackUrl(masteredPreviewMp3Url), [masteredPreviewMp3Url])

  const masteredPlayback = useMemo(
    () => resolveMasteredPlaybackUrl(masteredMp3Url, masteredWavUrl),
    [masteredMp3Url, masteredWavUrl]
  )

  const masteredPlaybackUrl = masteredPlayback.url

  /** iOS Safari: prefer MP3 when present; otherwise same MP3→WAV fallback as desktop. */
  const desktopMasteredPlaybackUrl = useMemo(() => {
    if (isIOSSafari() && masteredMp3Url) return masteredMp3Url
    return masteredPlaybackUrl
  }, [masteredMp3Url, masteredPlaybackUrl])

  const mobilePlaybackUrl = useMemo(() => {
    if (selectedSource !== "mastered") return originalPreviewUrl
    // Match desktop iOS Safari: prefer lightweight MP3 preview when both URLs exist.
    if (isIOSSafari() && masteredMp3Url) return masteredMp3Url
    return masteredPlaybackUrl
  }, [selectedSource, masteredPlaybackUrl, originalPreviewUrl, masteredMp3Url])

  useEffect(() => {
    if (!originalPreviewUrl) {
      logPreview("original preview URL missing", { audioUrl: audioUrl || null })
    }
    if (!masteredMp3Url && !masteredWavUrl) {
      logPreview("mastered preview URLs missing (MP3 and WAV)", {
        masteredPreviewMp3Url: masteredPreviewMp3Url || null,
        masteredUrl: masteredUrl || null,
      })
    } else if (!masteredMp3Url && masteredWavUrl) {
      logPreview("MP3 preview missing — will use mastered WAV", { masteredWavUrl })
    }
  }, [originalPreviewUrl, masteredMp3Url, masteredWavUrl, audioUrl, masteredPreviewMp3Url, masteredUrl])

  useEffect(() => {
    if (masteredPlayback.via === "wav" && masteredMp3Url == null && masteredWavUrl) {
      logPreview("fallback to mastered WAV playback", { url: masteredWavUrl })
    }
    if (masteredPlayback.via === "mp3" && masteredMp3Url) {
      logPreview("using MP3 preview URL", { url: masteredMp3Url })
    }
  }, [masteredPlayback.via, masteredMp3Url, masteredWavUrl])

  useEffect(() => {
    if (!isMobileClient) return
    const label = selectedSource === "mastered" ? "mastered" : "original"
    if (mobilePlaybackUrl) {
      logPreview("mobile preview URL selected", { source: label, url: mobilePlaybackUrl })
    } else {
      logPreview("mobile preview URL missing for selected source", { source: label })
    }
  }, [isMobileClient, selectedSource, mobilePlaybackUrl])

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
    if (!original && !mastered) return

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

    const cleanups: Array<() => void> = []
    if (original) cleanups.push(attach(original, "original"))
    if (mastered) cleanups.push(attach(mastered, "mastered"))
    return () => {
      for (const fn of cleanups) fn()
    }
  }, [originalPreviewUrl, desktopMasteredPlaybackUrl, isMobileClient])

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
  }, [isMobileClient, selectedSource, mobilePlaybackUrl])

  const selectSource = async (next: "original" | "mastered") => {
    if (next === "mastered" && !masteredPlaybackUrl) return
    if (next === "original" && !originalPreviewUrl) return
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
      const nextSrc =
        next === "mastered"
          ? isIOSSafari() && masteredMp3Url
            ? masteredMp3Url
            : masteredPlaybackUrl
          : originalPreviewUrl

      pauseAll()
      setSelectedSource(next)

      if (!el || !isPlayableMediaUrl(nextSrc)) return

      isSwappingMobileSourceRef.current = true
      try {
        if (el.src !== nextSrc) {
          el.pause()
          el.src = nextSrc
          el.load()
          await waitForReady(el)
        }
        applyTimelineToElement(el, next, abs, true)
        setPlayProgress(progressPercentFromAbsolute(abs))
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
      const nextSrc = mobilePlaybackUrl
      if (!isPlayableMediaUrl(nextSrc)) {
        logPreview("mobile play aborted — no valid preview URL", { selectedSource })
        return
      }
      el.pause()
      if (el.src !== nextSrc) {
        el.src = nextSrc
        el.load()
      }
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
      if (selectedSourceRef.current === "mastered") {
        const playUrl = desktopMasteredPlaybackUrl
        if (!isPlayableMediaUrl(playUrl)) {
          logPreview("desktop mastered play aborted — no valid preview URL", {
            desktopMasteredPlaybackUrl: playUrl,
            masteredMp3Url,
            masteredWavUrl,
          })
          setIsPlaying(false)
          return
        }
        logPreview("desktop mastered preview URL selected", { url: playUrl, via: masteredPlayback.via })
        originalAudioRef.current?.pause()
        const masteredEl = masteredAudioRef.current
        if (masteredEl) {
          if (masteredEl.src !== playUrl) {
            masteredEl.src = playUrl
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

  const windowStart = PREVIEW_START
  const windowLen = PREVIEW_DURATION
  const playHeadSec = absoluteFromProgressPercent(playProgress)
  const windowEndSec = PREVIEW_END
  const previewProgress = playProgress / 100

  const seekPreview = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress))
    const absoluteSec = PREVIEW_START + p * PREVIEW_DURATION
    sharedTimelineSecRef.current = absoluteSec
    const el = isMobileClient
      ? mobileAudioRef.current
      : selectedSource === "mastered"
        ? masteredAudioRef.current
        : originalAudioRef.current
    if (!el) return
    applyTimelineToElement(el, selectedSource, absoluteSec, isMobileClient)
    if (!isMobileClient) {
      syncDesktopElementsToTimeline(absoluteSec)
    }
    setPlayProgress(p * 100)
  }

  const masteringInsights = useMemo(
    () => mergeInsightsFromAnalysis(targetLufs, stylePreset, analysisAfter ?? undefined),
    [targetLufs, stylePreset, analysisAfter]
  )

  const masterDescriptor = useMemo(
    () => buildMasterDescriptor(stylePreset, analysisAfter ?? undefined, masteringInsights),
    [stylePreset, analysisAfter, masteringInsights]
  )

  const qualityTags = useMemo(
    () => buildQualityTags(analysisAfter ?? undefined, masteringInsights),
    [analysisAfter, masteringInsights]
  )

  const metricRows = useMemo(
    () => buildQualityMetricRows(analysisBefore ?? undefined, analysisAfter ?? undefined, masteringInsights),
    [analysisBefore, analysisAfter, masteringInsights]
  )

  const adaptiveMessage = adaptiveStatusMessage(masteringInsights)
  const adaptiveDetails = adaptiveDetailLines(masteringInsights)
  const measuredApprox = approximateLufsLabel(masteringInsights.measuredLufs)
  const loudnessCardTitle = smartLoudnessTitle(targetLufs, masteringInsights.adaptiveApplied)
  const loudnessCardSubtitle = smartLoudnessSubtitle(
    targetLufs,
    masteringInsights.appliedLufs,
    masteringInsights.adaptiveApplied,
    masteringInsights.materialTransparent
  )

  const trackMeta = useMemo(() => {
    if (!file?.name) return null
    return parseTrackDisplayName(file.name)
  }, [file?.name])

  if (!mounted) return null

  if (!masteredWavUrl) {
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
    <motion.div className="mx-auto w-full max-w-[1080px] px-5 pb-3 pt-5 sm:px-6 md:px-10 md:pb-4 md:pt-6 lg:px-12">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="text-[1.7rem] font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-[1.95rem] md:text-[2.1rem]">
          Your master is ready!
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[15px] font-medium tracking-[-0.01em] text-violet-100/88 sm:mt-3.5 sm:text-base">
          {masterDescriptor}
        </p>
        <div
          className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-violet-400/35 to-transparent sm:mt-3.5 sm:w-16 sm:via-violet-400/30"
          aria-hidden
        />
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-snug text-white/70 md:mt-3.5 md:text-[14px] md:leading-relaxed">
          Smart mastering tuned for punch, clarity, and your loudness goal.
        </p>
        {adaptiveMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-3 flex max-w-md flex-col items-center gap-1.5"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-[11px] font-medium text-emerald-200/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" aria-hidden />
              {adaptiveMessage}
            </span>
            {adaptiveDetails.map((line) => (
              <span key={line} className="text-[11px] text-white/68">
                {line}
              </span>
            ))}
          </motion.div>
        ) : null}
        {qualityTags.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="mx-auto mt-3 flex max-w-md flex-wrap justify-center gap-1.5"
          >
            {qualityTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/50"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        ) : null}
        {trackMeta ? (
          <div className="mx-auto mt-6 max-w-md px-2 text-center sm:mt-7">
            <p className="text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white/78 sm:text-[18px]">
              {trackMeta.title}
            </p>
            {trackMeta.artist ? (
              <p className="mt-1.5 text-[12px] font-medium leading-snug tracking-[0.01em] text-white/68 sm:text-[13px]">
                {trackMeta.artist}
              </p>
            ) : null}
          </div>
        ) : null}
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
        className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_56px_rgba(0,0,0,0.46),0_0_72px_rgba(124,58,237,0.09)] backdrop-blur-2xl md:mt-10 md:rounded-[1.35rem] md:p-8 lg:p-9"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-stretch lg:gap-10 xl:gap-11">
          {/* Before / After metrics */}
          <div className="flex min-w-0 flex-col">
            <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-white/60">Sound profile</p>
            <p className="mt-1 text-[11px] leading-snug text-white/64">How your master feels — not just the numbers.</p>
            <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-white/[0.05] bg-black/[0.26] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <table className="w-full table-fixed border-collapse text-left text-[12px] md:text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.045] bg-white/[0.02]">
                    <th className="w-[34%] px-3 py-2.5 pl-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60 md:px-4 md:py-3" />
                    <th className="w-[33%] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/64 md:px-4 md:py-3">
                      Before
                    </th>
                    <th className="w-[33%] px-3 py-2.5 pr-4 text-right text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-200/50 md:px-4 md:py-3 md:text-left">
                      Master
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {metricRows.map((row) => (
                    <tr key={row.label} className="transition-colors duration-150 hover:bg-white/[0.015]">
                      <td className="px-3 py-3.5 pl-4 font-medium text-white/75 md:px-4 md:py-4">{row.label}</td>
                      <td className="px-3 py-3.5 text-[12px] text-white/58 md:px-4 md:py-4">{row.before}</td>
                      <td className="px-3 py-3.5 pr-4 text-right md:px-4 md:py-4 md:text-left">
                        <span className="block text-[13px] font-semibold leading-snug tracking-tight text-emerald-200/[0.92] md:text-[14px]">
                          {row.after}
                        </span>
                        {row.afterDetail ? (
                          <span className="mt-0.5 block text-[10px] font-normal tabular-nums text-white/64">{row.afterDetail}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview + settings */}
          <div className="flex min-w-0 flex-col gap-4 lg:gap-4">
            <div className="card-pad-mobile flex flex-1 flex-col rounded-xl border border-white/[0.055] bg-black/[0.3] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] md:p-5">
              <p className="text-center text-[9px] font-semibold uppercase tracking-[0.24em] text-white/60">Mastering preview</p>

              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => selectSource("original")}
                  className={`min-h-[44px] rounded-lg py-2.5 text-[11px] font-semibold transition-all duration-200 active:scale-[0.98] sm:min-h-0 sm:py-2.5 sm:text-xs ${
                    selectedSource === "original"
                      ? "bg-gradient-to-r from-violet-600/75 to-indigo-600/78 text-white shadow-[0_0_10px_rgba(99,102,241,0.11)] ring-1 ring-white/[0.07]"
                      : "border border-white/[0.06] bg-white/[0.03] text-white/48 hover:border-white/[0.09] hover:bg-white/[0.055] hover:text-white/88"
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => selectSource("mastered")}
                  className={`min-h-[44px] rounded-lg py-2.5 text-[11px] font-semibold transition-all duration-200 active:scale-[0.98] sm:min-h-0 sm:py-2.5 sm:text-xs ${
                    selectedSource === "mastered"
                      ? "bg-gradient-to-r from-violet-600/75 to-indigo-600/78 text-white shadow-[0_0_10px_rgba(99,102,241,0.11)] ring-1 ring-white/[0.07]"
                      : "border border-white/[0.06] bg-white/[0.03] text-white/48 hover:border-white/[0.09] hover:bg-white/[0.055] hover:text-white/88"
                  }`}
                >
                  Mastered
                </button>
              </div>

              <CinematicWaveform
                mode="result"
                audioSrc={originalPreviewUrl}
                secondaryAudioSrc={masteredPlaybackUrl}
                blend={selectedSource === "mastered" ? 1 : 0}
                variant={selectedSource}
                progress={previewProgress}
                isPlaying={isPlaying}
                windowStartSec={windowStart}
                windowDurationSec={windowLen}
                isMobileMastered={false}
                interactive={Boolean(
                  isMobileClient
                    ? mobilePlaybackUrl
                    : selectedSource === "mastered"
                      ? desktopMasteredPlaybackUrl
                      : originalPreviewUrl
                )}
                onSeek={seekPreview}
                height={isMobileClient ? 104 : 88}
                className="mt-4 w-full sm:mt-3"
              />

              <div className="mt-4 flex min-h-[4.25rem] items-center gap-3.5 sm:mt-4">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/95 to-indigo-700/95 text-white shadow-[0_0_12px_rgba(99,102,241,0.12),0_6px_16px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.08] transition-all duration-200 hover:brightness-[1.05] hover:shadow-[0_0_14px_rgba(99,102,241,0.14)] active:scale-[0.97] sm:h-12 sm:w-12"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <span className="flex gap-0.5">
                      <span className="block h-3.5 w-1 rounded-sm bg-white/95" />
                      <span className="block h-3.5 w-1 rounded-sm bg-white/95" />
                    </span>
                  ) : (
                    <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[11px] tabular-nums text-white/66">
                    <span>
                      {fmtClock(playHeadSec)} / {fmtClock(windowEndSec)}
                    </span>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-white/60 transition-colors duration-200 hover:bg-white/[0.05] hover:text-white/75"
                      aria-label="Expand preview"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400/75 to-sky-500/55"
                      style={{ width: `${playProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
              <div className="flex flex-col justify-center rounded-xl border border-white/[0.05] bg-black/[0.26] px-4 py-3 md:px-4 md:py-3.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/60">Mastering style</p>
                <p className="mt-1 text-[13px] font-medium leading-snug text-teal-200/75 md:text-sm">{STYLE_LABELS[stylePreset]}</p>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-white/[0.05] bg-black/[0.26] px-4 py-3 md:px-4 md:py-3.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/60">Loudness profile</p>
                <p className="mt-1 text-[13px] font-medium leading-snug text-teal-200/80 md:text-sm">{loudnessCardTitle}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/68">{loudnessCardSubtitle}</p>
                {measuredApprox ? (
                  <p className="mt-1.5 text-[10px] tabular-nums text-white/60">{measuredApprox}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mx-auto mt-5 flex w-full max-w-[28rem] flex-col gap-3 sm:mt-6 sm:flex-row sm:justify-center sm:gap-4"
      >
        {!isPaid ? (
          <button
            type="button"
            onClick={handlePayment}
            className="inline-flex min-h-[54px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-9 text-[15px] font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.12),0_10px_28px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.08] transition-all duration-200 hover:brightness-[1.06] hover:shadow-[0_0_18px_rgba(99,102,241,0.14),0_12px_32px_rgba(0,0,0,0.42)] active:scale-[0.99]"
          >
            Pay $9 &amp; download
          </button>
        ) : (
          <a
            href={masteredWavUrl || "#"}
            download="master.wav"
            className="inline-flex min-h-[54px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-9 text-[15px] font-semibold text-white shadow-[0_0_14px_rgba(99,102,241,0.12),0_10px_28px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.08] transition-all duration-200 hover:brightness-[1.06] hover:shadow-[0_0_18px_rgba(99,102,241,0.14),0_12px_32px_rgba(0,0,0,0.42)] active:scale-[0.99]"
          >
            Download master
          </a>
        )}
        <Link
          href="/master"
          onClick={() => resetSession()}
          className="inline-flex min-h-[54px] flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-8 text-[14px] font-semibold text-white/82 transition-all duration-200 hover:border-white/[0.11] hover:bg-white/[0.055] hover:text-white/92 active:scale-[0.99]"
        >
          New master
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mx-auto mt-4 max-w-md pb-1 text-center md:mt-5"
      >
        <p className="text-[12px] leading-relaxed text-white/66 md:text-[13px]">Happy with the result? Share your master!</p>
        <button
          type="button"
          onClick={handleShare}
          className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/[0.28] px-4 py-2 text-[11px] font-medium text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white/85 active:scale-[0.98] md:mt-3 md:px-5 md:text-xs"
        >
          <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z" />
          </svg>
          {shareLabel}
        </button>
      </motion.div>

      {originalPreviewUrl ? (
        <audio
          ref={originalAudioRef}
          src={originalPreviewUrl}
          playsInline
          preload={isMobileClient ? "metadata" : "auto"}
          className="hidden"
        />
      ) : null}
      {desktopMasteredPlaybackUrl ? (
        <audio
          ref={masteredAudioRef}
          src={desktopMasteredPlaybackUrl}
          playsInline
          preload={isMobileClient ? "metadata" : "auto"}
          className="hidden"
        />
      ) : null}
      {isMobileClient && isPlayableMediaUrl(mobilePlaybackUrl) ? (
        <audio
          ref={mobileAudioRef}
          src={mobilePlaybackUrl}
          playsInline
          preload="metadata"
          className="hidden"
        />
      ) : null}
    </motion.div>
  )
}
