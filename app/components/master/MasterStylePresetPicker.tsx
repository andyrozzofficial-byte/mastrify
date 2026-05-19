"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { MasterStylePreset } from "../../master/MasterSessionProvider"

type PresetAccent = {
  iconBg: string
  iconRing: string
  glow: string
  activeBorder: string
}

type PresetDefinition = {
  id: MasterStylePreset
  label: string
  tagline: string
  accent: PresetAccent
  icon: ReactNode
  detail: {
    summary: string
    tone: string
    dynamics: string
    stereo: string
    genres: string
    intensity: "Subtle" | "Moderate" | "Bold"
  }
}

const PRESETS: PresetDefinition[] = [
  {
    id: "STREAM",
    label: "Balanced",
    tagline: "Natural & versatile",
    accent: {
      iconBg: "from-cyan-500/25 via-indigo-500/20 to-violet-600/15",
      iconRing: "ring-cyan-300/30",
      glow: "shadow-[0_0_28px_rgba(34,211,238,0.22)]",
      activeBorder: "border-cyan-300/45",
    },
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.35} d="M12 3v18M8 9l4-4 4 4M8 15l4 4 4-4" />
      </svg>
    ),
    detail: {
      summary: "All-purpose mastering with clean level, balanced tone, and safe translation everywhere.",
      tone: "Neutral polish with even lows and controlled highs.",
      dynamics: "Transparent compression that preserves musical movement.",
      stereo: "Natural width with a stable, mono-safe center.",
      genres: "Pop, indie, singer-songwriter, podcasts, general streaming.",
      intensity: "Subtle",
    },
  },
  {
    id: "WARM",
    label: "Warm",
    tagline: "Soft & smooth",
    accent: {
      iconBg: "from-amber-500/28 via-orange-500/18 to-rose-500/12",
      iconRing: "ring-amber-300/35",
      glow: "shadow-[0_0_28px_rgba(251,191,36,0.2)]",
      activeBorder: "border-amber-300/45",
    },
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.35}
          d="M12 3v1m0 16v1m8-9h-1M5 12H4m13.364-5.364l-.707.707M6.343 17.657l-.707.707M17.657 6.343l-.707-.707M6.343 6.343l-.707-.707"
        />
      </svg>
    ),
    detail: {
      summary: "Adds body and rounds sharp edges for a fuller, less aggressive master.",
      tone: "Softer top end with richer low-mid warmth.",
      dynamics: "Gentle compression that keeps the mix breathing.",
      stereo: "Slightly narrower image with an intimate focus.",
      genres: "R&B, soul, lo-fi, mellow electronic, acoustic.",
      intensity: "Subtle",
    },
  },
  {
    id: "LOUD",
    label: "Punchy",
    tagline: "Loud & aggressive",
    accent: {
      iconBg: "from-rose-500/28 via-red-500/22 to-orange-500/14",
      iconRing: "ring-rose-300/35",
      glow: "shadow-[0_0_30px_rgba(244,63,94,0.24)]",
      activeBorder: "border-rose-300/45",
    },
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.35} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    detail: {
      summary: "Pushes density, impact, and forwardness for competitive loudness.",
      tone: "Tighter lows with more midrange punch and edge.",
      dynamics: "Firm limiting and compression for maximum impact.",
      stereo: "Focused center image that hits hard on small speakers.",
      genres: "Hip-hop, trap, pop drops, high-energy electronic.",
      intensity: "Bold",
    },
  },
  {
    id: "CLUB",
    label: "Club",
    tagline: "Heavy & impactful",
    accent: {
      iconBg: "from-violet-500/30 via-purple-600/22 to-fuchsia-500/14",
      iconRing: "ring-violet-300/35",
      glow: "shadow-[0_0_30px_rgba(139,92,246,0.26)]",
      activeBorder: "border-violet-300/45",
    },
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.35}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-13c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    ),
    detail: {
      summary: "Prioritizes sub weight, punch, and playback impact on larger systems.",
      tone: "Thick low end with controlled mud and strong body.",
      dynamics: "Club-ready density with assertive transient control.",
      stereo: "Controlled width that stays powerful on PA systems.",
      genres: "House, techno, bass music, club-focused releases.",
      intensity: "Bold",
    },
  },
  {
    id: "FESTIVAL",
    label: "Open",
    tagline: "Wide & spacious",
    accent: {
      iconBg: "from-sky-400/28 via-blue-500/20 to-indigo-500/14",
      iconRing: "ring-sky-300/35",
      glow: "shadow-[0_0_30px_rgba(56,189,248,0.22)]",
      activeBorder: "border-sky-300/45",
    },
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.35}
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
      </svg>
    ),
    detail: {
      summary: "Brighter, wider, and more energetic with extra spatial lift.",
      tone: "More air, openness, and forward presence in the highs.",
      dynamics: "Energetic movement with festival-scale impact.",
      stereo: "Wider sides and immersive spatial depth.",
      genres: "Festival EDM, melodic house, anthemic pop, cinematic electronic.",
      intensity: "Moderate",
    },
  },
]

const INTENSITY_STYLES: Record<PresetDefinition["detail"]["intensity"], string> = {
  Subtle: "bg-emerald-500/12 text-emerald-200/85 ring-emerald-400/20",
  Moderate: "bg-amber-500/12 text-amber-200/85 ring-amber-400/20",
  Bold: "bg-rose-500/12 text-rose-200/85 ring-rose-400/20",
}

function InfoIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/78">{value}</p>
    </motion.div>
  )
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
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && preset ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
            aria-label="Close preset details"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-detail-title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[1.35rem] border border-white/[0.1] bg-[#090912] shadow-[0_-24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-2xl"
          >
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(124,58,237,0.2),transparent_70%)]"
              aria-hidden
            />
            <motion.div
              className="pointer-events-none absolute inset-x-8 top-3 h-1 rounded-full bg-white/15 sm:hidden"
              aria-hidden
            />
            <motion.div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6 sm:pt-6">
              <div className="flex items-start gap-4">
                <motion.div
                  layout
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${preset.accent.iconBg} text-white ring-1 ${preset.accent.iconRing} ${preset.accent.glow}`}
                >
                  {preset.icon}
                </motion.div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">Mastering style</p>
                  <h2 id="preset-detail-title" className="mt-1 text-xl font-bold tracking-tight text-white">
                    {preset.label}
                  </h2>
                  <p className="mt-0.5 text-sm text-cyan-200/70">{preset.tagline}</p>
                  <span
                    className={`mt-2.5 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${INTENSITY_STYLES[preset.detail.intensity]}`}
                  >
                    {preset.detail.intensity}
                  </span>
                </div>
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
              </div>

              <p className="relative mt-5 text-[13px] leading-relaxed text-white/68">{preset.detail.summary}</p>

              <div className="relative mt-4 grid gap-2.5">
                <DetailRow label="Tone" value={preset.detail.tone} />
                <DetailRow label="Dynamics" value={preset.detail.dynamics} />
                <DetailRow label="Stereo" value={preset.detail.stereo} />
                <DetailRow label="Best for" value={preset.detail.genres} />
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm font-semibold text-white/82 transition hover:bg-white/[0.07] hover:text-white"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function StylePresetCard({
  preset,
  active,
  onSelect,
  onInfo,
}: {
  preset: PresetDefinition
  active: boolean
  onSelect: () => void
  onInfo: () => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onInfo}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-black/40 text-white/45 backdrop-blur-sm transition hover:border-white/[0.14] hover:bg-black/55 hover:text-white/80"
        aria-label={`More about ${preset.label}`}
      >
        <InfoIcon />
      </button>

      <motion.button
        type="button"
        layout
        onClick={onSelect}
        whileTap={{ scale: 0.97 }}
        animate={active ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className={`group relative flex min-h-[9.25rem] w-full flex-col items-center rounded-2xl border px-3 pb-3.5 pt-3 text-center transition-[border-color,background,box-shadow] duration-300 sm:min-h-[10rem] sm:px-3.5 sm:pb-4 sm:pt-3.5 ${
          active
            ? `${preset.accent.activeBorder} bg-gradient-to-b from-white/[0.09] via-purple-500/[0.08] to-black/50 ${preset.accent.glow} ring-1 ring-white/[0.08]`
            : "border-white/[0.07] bg-black/30 hover:border-white/[0.12] hover:bg-white/[0.035]"
        }`}
        aria-pressed={active}
        aria-label={`${preset.label}. ${preset.tagline}`}
      >
        {active ? (
          <motion.span
            layoutId="preset-active-glow"
            className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_70%_55%_at_50%_20%,rgba(168,85,247,0.14),transparent_68%)]"
            aria-hidden
          />
        ) : null}

        <motion.span
          className={`relative mt-1 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl bg-gradient-to-br sm:h-16 sm:w-16 ${preset.accent.iconBg} text-white ring-1 ${preset.accent.iconRing} transition-shadow duration-300 ${
            active ? preset.accent.glow : "shadow-none group-hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]"
          }`}
          animate={active ? { y: [0, -2, 0] } : { y: 0 }}
          transition={active ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        >
          {preset.icon}
        </motion.span>

        <span className={`relative mt-3 text-[13px] font-semibold tracking-tight sm:text-sm ${active ? "text-white" : "text-white/88"}`}>
          {preset.label}
        </span>
        <span className={`relative mt-1 line-clamp-2 text-[11px] leading-snug sm:text-[11px] ${active ? "text-cyan-100/72" : "text-white/48"}`}>
          {preset.tagline}
        </span>
      </motion.button>
    </div>
  )
}

export type MasterStylePresetPickerProps = {
  value: MasterStylePreset
  onChange: (preset: MasterStylePreset) => void
}

export default function MasterStylePresetPicker({ value, onChange }: MasterStylePresetPickerProps) {
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-2.5">
        {PRESETS.map((preset) => (
          <StylePresetCard
            key={preset.id}
            preset={preset}
            active={value === preset.id}
            onSelect={() => onChange(preset.id)}
            onInfo={() => openDetail(preset.id)}
          />
        ))}
      </div>

      <StylePresetDetailSheet preset={detailPreset} open={detailPresetId !== null} onClose={closeDetail} />
    </>
  )
}
