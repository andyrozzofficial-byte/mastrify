"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "framer-motion"
import CinematicBackground from "../../components/CinematicBackground"
import { useMasterSession, type MasterStylePreset } from "../MasterSessionProvider"

const PRESETS: { id: MasterStylePreset; label: string; hint: string; icon: ReactNode }[] = [
  {
    id: "STREAM",
    label: "Balanced",
    hint: "Streaming & all-round",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18M8 9l4-4 4 4M8 15l4 4 4-4" />
      </svg>
    ),
  },
  {
    id: "WARM",
    label: "Warm",
    hint: "Round lows, softer top",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m8-9h-1M5 12H4m13.364-5.364l-.707.707M6.343 17.657l-.707.707M17.657 6.343l-.707-.707M6.343 6.343l-.707-.707" />
      </svg>
    ),
  },
  {
    id: "LOUD",
    label: "Punchy",
    hint: "Competitive loudness",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "CLUB",
    label: "Club",
    hint: "Weight & impact",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-13c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    id: "FESTIVAL",
    label: "Open",
    hint: "Wide & energetic",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
]

const LOUDNESS = [
  { lufs: -14, label: "Streaming" },
  { lufs: -13, label: "YouTube" },
  { lufs: -11, label: "Spotify Loud" },
  { lufs: -9, label: "CD / Club" },
]

function ThinSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium text-white/42">{label}</span>
        <span className="shrink-0 font-mono text-[10px] text-cyan-300/75">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-0.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.07] accent-purple-500 transition [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(192,132,252,0.85),0_0_6px_rgba(34,211,238,0.35)] [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(192,132,252,0.85)]"
      />
    </div>
  )
}

export default function MasterSettingsPage() {
  const router = useRouter()
  const {
    file,
    stylePreset,
    setStylePreset,
    targetLufs,
    setTargetLufs,
    stereoEnhance,
    setStereoEnhance,
    lowEndControl,
    setLowEndControl,
    clarityPresence,
    setClarityPresence,
  } = useMasterSession()

  useEffect(() => {
    if (!file) router.replace("/master")
  }, [file, router])

  if (!file) {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] text-white md:min-h-[calc(100vh-4rem)]">
        <CinematicBackground />
        <div className="relative flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
          <p className="text-sm text-white/50">Preparing session…</p>
          <Link href="/master" className="text-xs text-purple-300 hover:underline">
            Return to upload
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] text-white md:min-h-[calc(100vh-4rem)]">
      <CinematicBackground />
      <div className="relative mx-auto w-full max-w-[720px] px-4 pb-16 pt-8 md:px-6 md:pb-20 md:pt-10">
        <div className="relative">
          {/* Radial glow — behind main card */}
          <div
            className="pointer-events-none absolute left-1/2 top-[28%] z-0 h-[min(420px,90vw)] w-[min(680px,120%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_55%_42%_at_50%_50%,rgba(124,58,237,0.2),rgba(88,28,135,0.06)_50%,transparent_72%)] blur-3xl"
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.07] to-black/[0.72] p-6 shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_0_56px_rgba(88,28,135,0.22),0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-purple-500/10 backdrop-blur-2xl md:p-8 md:pb-7"
          >
            <Link
              href="/master"
              className="absolute left-5 top-5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/32 transition hover:text-white/55 md:left-6 md:top-6"
            >
              &lt; Back
            </Link>

            <header className="mb-6 pt-1 text-center md:mb-7">
              <h1 className="text-[1.35rem] font-bold tracking-tight text-white md:text-[1.5rem]">Master settings</h1>
              <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-snug text-white/38 md:text-[13px]">
                Choose the style and settings for your master.
              </p>
            </header>

            <div className="space-y-6 md:space-y-7">
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Mastering style</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {PRESETS.map((p) => {
                    const active = stylePreset === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setStylePreset(p.id)}
                        className={`flex flex-col rounded-xl border px-2.5 py-2.5 text-left transition md:px-3 md:py-3 ${
                          active
                            ? "border-purple-400/55 bg-gradient-to-b from-purple-500/[0.18] to-black/35 text-white shadow-[0_0_28px_rgba(168,85,247,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-purple-400/25"
                            : "border-white/[0.06] bg-black/25 text-white/55 hover:border-white/[0.1] hover:bg-white/[0.03]"
                        }`}
                      >
                        <span
                          className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                            active ? "bg-white/10 text-purple-200" : "bg-white/[0.04] text-white/35"
                          }`}
                        >
                          {p.icon}
                        </span>
                        <span className={`text-[12px] font-semibold leading-tight ${active ? "text-white" : "text-white/75"}`}>
                          {p.label}
                        </span>
                        <span className={`mt-1 block text-[10px] leading-snug ${active ? "text-white/45" : "text-white/30"}`}>
                          {p.hint}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Loudness target</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LOUDNESS.map((o) => {
                    const active = targetLufs === o.lufs
                    return (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => setTargetLufs(o.lufs)}
                        className={`rounded-xl border px-2.5 py-2 text-left transition md:px-3 md:py-2.5 ${
                          active
                            ? "border-purple-400/50 bg-purple-500/[0.12] text-white shadow-[0_0_22px_rgba(147,51,234,0.22)] ring-1 ring-purple-400/20"
                            : "border-white/[0.06] bg-black/20 text-white/45 hover:border-white/[0.1] hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className={`block text-[11px] font-semibold leading-tight ${active ? "text-white" : "text-white/65"}`}>
                          {o.label}
                        </span>
                        <span className={`mt-0.5 block text-[10px] font-medium tabular-nums ${active ? "text-white/45" : "text-white/28"}`}>
                          {o.lufs} LUFS
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Advanced options</h3>
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-x-6 md:gap-y-4">
                  <ThinSlider label="Stereo enhancement" value={stereoEnhance} onChange={setStereoEnhance} />
                  <ThinSlider label="Low end control" value={lowEndControl} onChange={setLowEndControl} />
                  <ThinSlider label="Clarity & presence" value={clarityPresence} onChange={setClarityPresence} />
                </div>
              </section>
            </div>

            <div className="mt-7 flex flex-col items-stretch gap-2.5 border-t border-white/[0.06] pt-6 md:mt-8 md:pt-7">
              <button
                type="button"
                onClick={() => router.push("/master/processing")}
                className="w-full rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] py-3 text-[13px] font-semibold text-white shadow-[0_0_36px_rgba(99,102,241,0.45),0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10 transition hover:brightness-110 md:text-sm"
              >
                Start mastering
              </button>
              <Link href="/master" className="pb-0.5 text-center text-[10px] text-white/30 transition hover:text-white/50">
                ← Change file
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
