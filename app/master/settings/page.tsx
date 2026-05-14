"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "framer-motion"
import BrandLogo from "../../components/BrandLogo"
import CinematicBackground from "../../components/CinematicBackground"
import { useMasterSession, type MasterStylePreset } from "../MasterSessionProvider"

const PRESETS: { id: MasterStylePreset; label: string; hint: string }[] = [
  { id: "STREAM", label: "Balanced", hint: "Streaming & all-round" },
  { id: "WARM", label: "Warm", hint: "Round lows, softer top" },
  { id: "LOUD", label: "Punchy", hint: "Competitive loudness" },
  { id: "CLUB", label: "Club", hint: "Weight & impact" },
  { id: "FESTIVAL", label: "Open", hint: "Wide & energetic" },
]

const LOUDNESS = [
  { lufs: -14, label: "Streaming" },
  { lufs: -13, label: "YouTube" },
  { lufs: -11, label: "Spotify loud" },
  { lufs: -9, label: "CD / Club" },
]

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-white/55">{label}</span>
        <span className="font-mono text-cyan-300/80">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-purple-500"
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
      <div className="relative mx-auto w-full max-w-4xl px-5 pb-28 pt-14 md:px-10 md:pt-20">
        <span className="mx-auto block w-fit rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200/90">
          Premium
        </span>
        <BrandLogo subtitle="AI MASTERING" className="mt-4" />

        <p className="mx-auto mt-4 max-w-md text-center text-sm text-white/50">
          Tune how your master should feel. These choices are saved for this session.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 space-y-10 rounded-3xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-black/45 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:space-y-12 md:p-10"
        >
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Style</h3>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStylePreset(p.id)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    stylePreset === p.id
                      ? "border-purple-400/50 bg-gradient-to-br from-purple-500/20 to-cyan-500/10 text-white ring-1 ring-white/10"
                      : "border-white/10 bg-black/20 text-white/70 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="font-semibold">{p.label}</span>
                  <span className="mt-0.5 block text-[11px] text-white/40">{p.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Loudness target</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {LOUDNESS.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setTargetLufs(o.lufs)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    targetLufs === o.lufs
                      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                      : "border-white/10 text-white/55 hover:border-white/25"
                  }`}
                >
                  {o.label}{" "}
                  <span className="text-white/35">
                    {o.lufs} LUFS
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Advanced</h3>
            <Slider label="Stereo enhancement" value={stereoEnhance} onChange={setStereoEnhance} />
            <Slider label="Low end control" value={lowEndControl} onChange={setLowEndControl} />
            <Slider label="Clarity & presence" value={clarityPresence} onChange={setClarityPresence} />
            <p className="text-[11px] leading-relaxed text-white/35">
              Visual guide for your session — the engine uses your file and proven defaults. More controls may ship later.
            </p>
          </section>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/master/processing")}
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 py-4 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(0,0,0,0.45)] transition hover:brightness-110"
            >
              Start mastering
            </button>
            <Link href="/master" className="text-center text-xs text-white/40 hover:text-white/65">
              ← Change file
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
