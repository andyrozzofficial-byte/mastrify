"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import "./preset-detail-modal.css"
import type { MasterStylePreset } from "../../master/MasterSessionProvider"

const STROKE = 1.35

type PresetAccent = {
  iconBg: string
  iconRing: string
  glow: string
  activeBorder: string
  activeAura: string
}

type PresetPersonality = {
  loudness: string
  stereo: string
  dynamics: string
}

type PresetMotionKey = "balanced" | "warm" | "punchy" | "club" | "open"

type PresetDefinition = {
  id: MasterStylePreset
  label: string
  tagline: string
  worksWellFor: string[]
  personality: PresetPersonality
  motionKey: PresetMotionKey
  accent: PresetAccent
  detail: {
    summary: string
    tone: string
    dynamics: string
    stereo: string
    genresNote: string
    intensity: "Subtle" | "Moderate" | "Bold"
  }
}

const PRESETS: PresetDefinition[] = [
  {
    id: "STREAM",
    label: "Balanced",
    tagline: "Natural & versatile",
    worksWellFor: ["Pop", "Rock", "EDM", "All-round"],
    personality: { loudness: "Streaming", stereo: "Natural", dynamics: "Open" },
    motionKey: "balanced",
    accent: {
      iconBg: "from-cyan-500/28 via-indigo-500/22 to-violet-600/16",
      iconRing: "ring-cyan-300/35",
      glow: "shadow-[0_0_28px_rgba(34,211,238,0.24)]",
      activeBorder: "border-cyan-300/50",
      activeAura: "bg-[radial-gradient(ellipse_70%_55%_at_50%_18%,rgba(34,211,238,0.16),transparent_68%)]",
    },
    detail: {
      summary: "The safe all-rounder — clean level, even tone, and translation you can trust on any platform.",
      tone: "Neutral polish with even lows and controlled highs.",
      dynamics: "Transparent compression that preserves musical movement.",
      stereo: "Natural width with a stable, mono-safe center.",
      genresNote: "Flexible starting point when you want polish without a strong color.",
      intensity: "Subtle",
    },
  },
  {
    id: "WARM",
    label: "Warm",
    tagline: "Soft & smooth",
    worksWellFor: ["Acoustic", "Indie", "Soul", "Vintage"],
    personality: { loudness: "Gentle", stereo: "Intimate", dynamics: "Smooth" },
    motionKey: "warm",
    accent: {
      iconBg: "from-amber-500/30 via-orange-500/20 to-rose-500/14",
      iconRing: "ring-amber-300/38",
      glow: "shadow-[0_0_28px_rgba(251,191,36,0.22)]",
      activeBorder: "border-amber-300/50",
      activeAura: "bg-[radial-gradient(ellipse_70%_55%_at_50%_18%,rgba(251,191,36,0.14),transparent_68%)]",
    },
    detail: {
      summary: "Adds body and rounds sharp edges for a fuller, less aggressive master.",
      tone: "Softer top end with richer low-mid warmth.",
      dynamics: "Gentle compression that keeps the mix breathing.",
      stereo: "Slightly narrower image with an intimate focus.",
      genresNote: "Great when you want comfort, nostalgia, or vocal-forward warmth.",
      intensity: "Subtle",
    },
  },
  {
    id: "LOUD",
    label: "Punchy",
    tagline: "Loud & aggressive",
    worksWellFor: ["EDM", "Rap", "Pop", "Rock"],
    personality: { loudness: "Loud", stereo: "Forward", dynamics: "Impact" },
    motionKey: "punchy",
    accent: {
      iconBg: "from-rose-500/30 via-red-500/24 to-orange-500/16",
      iconRing: "ring-rose-300/38",
      glow: "shadow-[0_0_32px_rgba(244,63,94,0.28)]",
      activeBorder: "border-rose-300/50",
      activeAura: "bg-[radial-gradient(ellipse_70%_55%_at_50%_18%,rgba(244,63,94,0.16),transparent_68%)]",
    },
    detail: {
      summary: "Pushes density, impact, and forwardness for competitive loudness.",
      tone: "Tighter lows with more midrange punch and edge.",
      dynamics: "Firm limiting and compression for maximum impact.",
      stereo: "Focused center image that hits hard on small speakers.",
      genresNote: "Ideal when you need energy, attitude, and chart-ready loudness.",
      intensity: "Bold",
    },
  },
  {
    id: "CLUB",
    label: "Club",
    tagline: "Heavy & impactful",
    worksWellFor: ["House", "Techno", "Festival", "Dance"],
    personality: { loudness: "Heavy", stereo: "Focused", dynamics: "Driving" },
    motionKey: "club",
    accent: {
      iconBg: "from-violet-500/32 via-purple-600/24 to-fuchsia-500/16",
      iconRing: "ring-violet-300/38",
      glow: "shadow-[0_0_32px_rgba(139,92,246,0.3)]",
      activeBorder: "border-violet-300/50",
      activeAura: "bg-[radial-gradient(ellipse_70%_55%_at_50%_22%,rgba(139,92,246,0.18),transparent_68%)]",
    },
    detail: {
      summary: "Prioritizes sub weight, punch, and playback impact on larger systems.",
      tone: "Thick low end with controlled mud and strong body.",
      dynamics: "Club-ready density with assertive transient control.",
      stereo: "Controlled width that stays powerful on PA systems.",
      genresNote: "Built for dancefloors — not limited to one genre if you want weight.",
      intensity: "Bold",
    },
  },
  {
    id: "FESTIVAL",
    label: "Open",
    tagline: "Wide & spacious",
    worksWellFor: ["Cinematic", "Ambient", "Progressive", "Live"],
    personality: { loudness: "Lifted", stereo: "Wide", dynamics: "Airy" },
    motionKey: "open",
    accent: {
      iconBg: "from-sky-400/30 via-blue-500/22 to-indigo-500/16",
      iconRing: "ring-sky-300/38",
      glow: "shadow-[0_0_32px_rgba(56,189,248,0.26)]",
      activeBorder: "border-sky-300/50",
      activeAura: "bg-[radial-gradient(ellipse_70%_55%_at_50%_18%,rgba(56,189,248,0.14),transparent_68%)]",
    },
    detail: {
      summary: "Brighter, wider, and more energetic with extra spatial lift.",
      tone: "More air, openness, and forward presence in the highs.",
      dynamics: "Energetic movement with festival-scale impact.",
      stereo: "Wider sides and immersive spatial depth.",
      genresNote: "Perfect when space, drama, and height matter more than raw loudness.",
      intensity: "Moderate",
    },
  },
]

const INTENSITY_STYLES: Record<PresetDefinition["detail"]["intensity"], string> = {
  Subtle: "bg-emerald-500/12 text-emerald-200/85 ring-emerald-400/20",
  Moderate: "bg-amber-500/12 text-amber-200/85 ring-amber-400/20",
  Bold: "bg-rose-500/12 text-rose-200/85 ring-rose-400/20",
}

function PresetIcon({ motionKey }: { motionKey: PresetMotionKey }) {
  const cls = "h-7 w-7"
  switch (motionKey) {
    case "balanced":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeWidth={STROKE} d="M4 18V6M7.5 18V8M11 18V10M13 18V10M16.5 18V8M20 18V6" opacity={0.35} />
          <path strokeLinecap="round" strokeWidth={STROKE} d="M6 15V9M10 16V8M14 16V8M18 15V9" />
          <path strokeLinecap="round" strokeWidth={1.1} d="M12 5.5v2M10.5 6.5h3" opacity={0.55} />
        </svg>
      )
    case "warm":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={STROKE}
            d="M12 3v1m0 16v1m8-9h-1M5 12H4m13.364-5.364l-.707.707M6.343 17.657l-.707.707M17.657 6.343l-.707-.707M6.343 6.343l-.707-.707"
          />
        </svg>
      )
    case "punchy":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={STROKE} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    case "club":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeWidth={STROKE} d="M12 4.5v3.5" />
          <circle cx="12" cy="4" r="1.25" fill="currentColor" stroke="none" />
          <path strokeLinecap="round" strokeWidth={STROKE} d="M7.5 11c1.8-2.8 7.2-2.8 9 0" />
          <path strokeLinecap="round" strokeWidth={STROKE} d="M6 14.5c2.8-4.2 9.2-4.2 12 0" opacity={0.85} />
          <path strokeLinecap="round" strokeWidth={STROKE} d="M5 18c3.5-5.5 10.5-5.5 14 0" opacity={0.65} />
          <path strokeLinecap="round" strokeWidth={1.1} d="M4 20.5h16" opacity={0.4} />
        </svg>
      )
    case "open":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={STROKE}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      )
  }
}

function iconMotion(motionKey: PresetMotionKey, active: boolean, reduce: boolean) {
  if (reduce || !active) {
    return { animate: { scale: 1, y: 0, opacity: 1 }, transition: { duration: 0.2 } }
  }
  switch (motionKey) {
    case "balanced":
      return {
        animate: { y: [0, -1.5, 0], rotate: [-0.6, 0.6, -0.6] },
        transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const },
      }
    case "warm":
      return {
        animate: { scale: [1, 1.04, 1], opacity: [0.88, 1, 0.88] },
        transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
      }
    case "punchy":
      return {
        animate: { scale: [1, 1.08, 1] },
        transition: { duration: 0.85, repeat: Infinity, ease: [0.36, 0, 0.2, 1] as const },
      }
    case "club":
      return {
        animate: { y: [0, 2, 0], scaleY: [1, 1.05, 1] },
        transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const },
      }
    case "open":
      return {
        animate: { scale: [1, 1.06, 1], rotate: [0, 0, 0] },
        transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" as const },
      }
  }
}

function InfoIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function PersonalityPills({
  personality,
  active,
  className = "",
  showSeparators = true,
}: {
  personality: PresetPersonality
  active: boolean
  className?: string
  showSeparators?: boolean
}) {
  const items = [personality.loudness, personality.stereo, personality.dynamics]
  const isGlance = className.includes("preset-glance-pills")
  return (
    <motion.div
      className={`relative flex flex-wrap items-center justify-center gap-1 ${isGlance ? "mt-0 px-0" : "mt-2 px-0.5"} ${className}`}
      initial={false}
      animate={{ opacity: active ? 1 : 0.85 }}
    >
      {items.map((item, i) => (
        <span key={item} className="inline-flex items-center gap-1">
          {showSeparators && i > 0 ? <span className="text-[8px] text-white/22">·</span> : null}
          <span
            className={`rounded-md px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] ${
              active ? "bg-white/[0.08] text-white/62" : "bg-white/[0.04] text-white/40"
            }`}
          >
            {item}
          </span>
        </span>
      ))}
    </motion.div>
  )
}

function WorksWellForLine({ genres, active }: { genres: string[]; active: boolean }) {
  return (
    <p className={`relative mt-2 px-1 text-[9px] leading-snug ${active ? "text-white/50" : "text-white/38"}`}>
      <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-white/32">Works well for</span>
      <span className="mt-0.5 block text-[10px] leading-snug tracking-tight text-white/55">{genres.join(" · ")}</span>
    </p>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/78">{value}</p>
    </div>
  )
}

const MOBILE_MODAL_MQ = "(max-width: 639px)"

function lockBodyScrollDesktop() {
  const prev = document.body.style.overflow
  document.body.style.overflow = "hidden"
  return () => {
    document.body.style.overflow = prev
  }
}

function lockBodyScrollMobile() {
  const scrollY = window.scrollY
  const body = document.body
  const html = document.documentElement
  const prev = {
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    htmlOverflow: html.style.overflow,
  }

  html.style.overflow = "hidden"
  body.style.overflow = "hidden"
  body.style.position = "fixed"
  body.style.top = `-${scrollY}px`
  body.style.left = "0"
  body.style.right = "0"
  body.style.width = "100%"

  return () => {
    body.style.overflow = prev.bodyOverflow
    body.style.position = prev.bodyPosition
    body.style.top = prev.bodyTop
    body.style.left = prev.bodyLeft
    body.style.right = prev.bodyRight
    body.style.width = prev.bodyWidth
    html.style.overflow = prev.htmlOverflow
    window.scrollTo(0, scrollY)
  }
}

function StylePresetDetailSheet({
  preset,
  open,
  onClose,
}: {
  preset: PresetDefinition | null
  open: boolean
  onClose: () => void
}) {
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)

    const mq = window.matchMedia(MOBILE_MODAL_MQ)
    let unlock = () => {}
    const syncLock = () => {
      unlock()
      unlock = mq.matches ? lockBodyScrollMobile() : lockBodyScrollDesktop()
    }
    syncLock()
    mq.addEventListener("change", syncLock)

    return () => {
      document.removeEventListener("keydown", onKey)
      unlock()
      mq.removeEventListener("change", syncLock)
    }
  }, [open, onClose])

  const gotItButton = (
    <button
      type="button"
      onClick={onClose}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm font-semibold text-white/82 transition hover:bg-white/[0.07] hover:text-white"
    >
      Got it
    </button>
  )

  if (!portalReady) return null

  return createPortal(
    <AnimatePresence>
      {open && preset ? (
        <motion.div
          className="preset-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            className="preset-detail-backdrop"
            aria-label="Close preset details"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-detail-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="preset-detail-sheet"
          >
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(124,58,237,0.2),transparent_70%)]"
              aria-hidden
            />
            <motion.div
              className="preset-detail-handle pointer-events-none absolute inset-x-8 top-3 z-10 h-1 rounded-full bg-white/15"
              aria-hidden
            />
            <div className="preset-detail-sheet-body">
                <motion.div className="flex items-start gap-4">
                  <motion.div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${preset.accent.iconBg} text-white ring-1 ${preset.accent.iconRing} ${preset.accent.glow}`}
                    {...iconMotion(preset.motionKey, true, false)}
                  >
                    <PresetIcon motionKey={preset.motionKey} />
                  </motion.div>
                  <motion.div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">Sonic personality</p>
                    <h2 id="preset-detail-title" className="mt-1 text-xl font-bold tracking-tight text-white">
                      {preset.label}
                    </h2>
                    <p className="mt-0.5 text-sm text-cyan-200/70">{preset.tagline}</p>
                    <span
                      className={`mt-2.5 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${INTENSITY_STYLES[preset.detail.intensity]}`}
                    >
                      {preset.detail.intensity}
                    </span>
                  </motion.div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                    aria-label="Close"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>

                <div className="preset-glance-card relative mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <div className="preset-glance-inner">
                    <p className="preset-glance-title text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Character at a glance
                    </p>
                    <PersonalityPills
                      personality={preset.personality}
                      active
                      showSeparators={false}
                      className="preset-glance-pills"
                    />
                  </div>
                </div>

                <p className="relative mt-4 text-[13px] leading-relaxed text-white/68">{preset.detail.summary}</p>

                <motion.div className="relative mt-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Works well for</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-white/55">{preset.worksWellFor.join(" · ")}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/42">{preset.detail.genresNote}</p>
                </motion.div>

                <div className="relative mt-4 grid gap-2.5">
                  <DetailRow label="Loudness feel" value={preset.personality.loudness} />
                  <DetailRow label="Stereo feel" value={preset.personality.stereo} />
                  <DetailRow label="Dynamics" value={preset.personality.dynamics} />
                  <DetailRow label="Tone" value={preset.detail.tone} />
                  <DetailRow label="Technical stereo" value={preset.detail.stereo} />
                </div>

                <div className="preset-detail-cta preset-detail-cta--desktop">{gotItButton}</div>
                <div className="preset-detail-cta preset-detail-cta--mobile">{gotItButton}</div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}


function StylePresetCard({
  preset,
  active,
  onSelect,
  onInfo,
  reduceMotion,
}: {
  preset: PresetDefinition
  active: boolean
  onSelect: () => void
  onInfo: () => void
  reduceMotion: boolean
}) {
  const iconAnim = iconMotion(preset.motionKey, active, reduceMotion)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onInfo}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-black/45 text-white/45 backdrop-blur-sm transition hover:border-white/[0.14] hover:bg-black/60 hover:text-white/85 active:scale-95"
        aria-label={`More about ${preset.label}`}
      >
        <InfoIcon />
      </button>

      <motion.button
        type="button"
        layout
        onClick={onSelect}
        whileTap={{ scale: 0.96 }}
        animate={
          active
            ? { scale: 1.02, boxShadow: "0 0 24px rgba(124,58,237,0.12)" }
            : { scale: 1, boxShadow: "0 0 0px rgba(0,0,0,0)" }
        }
        transition={{ type: "spring", stiffness: 400, damping: 26 }}
        className={`group relative flex min-h-[11.5rem] w-full flex-col items-center rounded-2xl border px-2.5 pb-3.5 pt-3 text-center transition-colors duration-300 sm:min-h-[12rem] sm:px-3 sm:pb-4 lg:min-h-[10.5rem] lg:pb-3 ${
          active
            ? `${preset.accent.activeBorder} bg-gradient-to-b from-white/[0.1] via-purple-500/[0.09] to-black/55 ring-1 ring-white/[0.1]`
            : "border-white/[0.07] bg-black/32 hover:border-white/[0.13] hover:bg-white/[0.04]"
        }`}
        aria-pressed={active}
        aria-label={`${preset.label}. ${preset.tagline}. Works well for ${preset.worksWellFor.join(", ")}`}
      >
        <AnimatePresence>
          {active ? (
            <motion.span
              layoutId="preset-active-aura"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-none absolute inset-0 rounded-2xl ${preset.accent.activeAura}`}
              aria-hidden
            />
          ) : null}
        </AnimatePresence>

        <motion.span
          className={`relative mt-0.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br sm:h-[3.75rem] sm:w-[3.75rem] ${preset.accent.iconBg} text-white ring-1 ${preset.accent.iconRing} transition-shadow duration-300 ${
            active ? preset.accent.glow : "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.07)]"
          }`}
          {...iconAnim}
        >
          <PresetIcon motionKey={preset.motionKey} />
        </motion.span>

        <span className={`relative mt-2.5 text-[13px] font-semibold tracking-tight sm:text-sm ${active ? "text-white" : "text-white/90"}`}>
          {preset.label}
        </span>
        <span className={`relative mt-0.5 text-[11px] leading-snug ${active ? "text-cyan-100/75" : "text-white/46"}`}>
          {preset.tagline}
        </span>

        <div className="lg:hidden">
          <PersonalityPills personality={preset.personality} active={active} />
          <WorksWellForLine genres={preset.worksWellFor} active={active} />
        </div>
        <p
          className={`relative mt-2 hidden px-1 text-[8px] leading-snug tracking-wide lg:block ${
            active ? "text-white/48" : "text-white/36"
          }`}
        >
          {preset.personality.loudness} · {preset.personality.stereo} · {preset.personality.dynamics}
        </p>
      </motion.button>
    </div>
  )
}

export type MasterStylePresetPickerProps = {
  value: MasterStylePreset
  onChange: (preset: MasterStylePreset) => void
}

export default function MasterStylePresetPicker({ value, onChange }: MasterStylePresetPickerProps) {
  const reduceMotion = useReducedMotion()
  const [detailPresetId, setDetailPresetId] = useState<MasterStylePreset | null>(null)
  const detailPreset = PRESETS.find((p) => p.id === detailPresetId) ?? null

  const openDetail = useCallback((id: MasterStylePreset) => {
    setDetailPresetId(id)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailPresetId(null)
  }, [])

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-5 lg:gap-2.5">
        {PRESETS.map((preset) => (
          <StylePresetCard
            key={preset.id}
            preset={preset}
            active={value === preset.id}
            onSelect={() => onChange(preset.id)}
            onInfo={() => openDetail(preset.id)}
            reduceMotion={reduceMotion ?? false}
          />
        ))}
      </div>

      <StylePresetDetailSheet preset={detailPreset} open={detailPresetId !== null} onClose={closeDetail} />
    </>
  )
}
