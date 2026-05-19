"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import CinematicBackground from "../../components/CinematicBackground"
import MasterStylePresetPicker from "../../components/master/MasterStylePresetPicker"
import { useMasterSession } from "../MasterSessionProvider"
import { AUDIO_UPLOAD_ACCEPT, isAcceptedAudioUpload } from "../../../lib/audioUploadAccept"

const LOUDNESS = [
  { lufs: -14, label: "Streaming", detail: "Most transparent. Best for balanced streaming playback." },
  { lufs: -13, label: "YouTube", detail: "A small lift while preserving dynamics." },
  { lufs: -11, label: "Spotify Loud", detail: "Noticeably louder and denser for casual listening." },
  { lufs: -9, label: "CD / Club", detail: "Maximum loudness target. More impact, less dynamic headroom." },
]

function ThinSlider({
  label,
  description,
  helper,
  value,
  onChange,
}: {
  label: string
  description: string
  helper: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium text-white/72">{label}</span>
        <span className="shrink-0 font-mono text-[10px] text-cyan-300/75">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-0.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.07] accent-purple-500 transition [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(192,132,252,0.45),0_0_4px_rgba(34,211,238,0.12)] [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(192,132,252,0.45)]"
      />
      <div className="space-y-0.5">
        <p className="text-[10px] leading-snug text-white/45">{description}</p>
        <p className="text-[10px] leading-snug text-cyan-200/62">{helper}</p>
      </div>
    </div>
  )
}

function sliderHelper(type: "stereo" | "low" | "clarity", value: number) {
  if (type === "stereo") {
    if (value < 35) return "Lower values narrow the sides and keep vocals, kick, and bass more centered."
    if (value < 70) return "Mid values preserve a natural stereo image with controlled spatial depth."
    return "Higher values open cinematic width and air while keeping vocals and kick/snare centered."
  }
  if (type === "low") {
    if (value < 35) return "Lower values tighten subs and reduce boom for cleaner kick/bass separation."
    if (value < 70) return "Mid values keep the low end balanced and controlled."
    return "Higher values add bass body and heavier release-ready weight."
  }
  if (value < 35) return "Lower values smooth sharp highs and keep the master warmer."
  if (value < 70) return "Mid values add detail while keeping vocals and instruments natural."
  return "Higher values add polished detail, presence, and release-ready shine — not just boosted highs."
}

export default function MasterSettingsPage() {
  const router = useRouter()
  const reconnectInputRef = useRef<HTMLInputElement>(null)
  const {
    file,
    analysisBefore,
    sessionHydrated,
    reconnectSourceFile,
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
    if (!sessionHydrated) return
    if (!file && !analysisBefore) {
      router.replace("/master")
    }
  }, [file, analysisBefore, sessionHydrated, router])

  if (!sessionHydrated) {
    return (
      <div className="relative text-white">
        <CinematicBackground />
        <div className="relative flex flex-col items-center justify-center gap-4 px-6 py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
          <p className="text-sm text-white/50">Restoring session…</p>
        </div>
      </div>
    )
  }

  if (!file && analysisBefore) {
    return (
      <div className="relative text-white">
        <CinematicBackground />
        <div className="relative mx-auto flex max-w-md flex-col items-center justify-center gap-5 px-6 py-12 text-center">
          <input
            ref={reconnectInputRef}
            type="file"
            className="hidden"
            accept={AUDIO_UPLOAD_ACCEPT}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && isAcceptedAudioUpload(f)) reconnectSourceFile(f)
              e.target.value = ""
            }}
          />
          <p className="text-sm leading-relaxed text-white/55">
            Your mastering preferences and analysis were restored. Select the same audio file again to continue — this
            does not clear your saved analysis snapshot.
          </p>
          <button
            type="button"
            onClick={() => reconnectInputRef.current?.click()}
            className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-6 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10 transition hover:brightness-110"
          >
            Choose audio file
          </button>
          <Link href="/master" className="text-xs text-purple-300 hover:underline">
            Start over from upload
          </Link>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="relative text-white">
        <CinematicBackground />
        <div className="relative flex flex-col items-center justify-center gap-4 px-6 py-12">
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
    <div className="relative text-white">
      <CinematicBackground />
      <div className="relative mx-auto w-full max-w-[720px] px-4 pb-10 pt-5 md:px-6 md:pb-12 md:pt-6">
        <div className="relative">
          {/* Radial glow — behind main card */}
          <div
            className="pointer-events-none absolute left-1/2 top-[28%] z-0 h-[min(420px,90vw)] w-[min(680px,120%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_55%_42%_at_50%_50%,rgba(124,58,237,0.11),rgba(88,28,135,0.032)_50%,transparent_72%)] blur-3xl"
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.07] to-black/[0.72] p-6 shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_0_32px_rgba(88,28,135,0.1),0_28px_72px_rgba(0,0,0,0.62)] ring-1 ring-purple-500/8 backdrop-blur-2xl md:p-8 md:pb-7"
          >
            <Link
              href="/master"
              className="absolute left-5 top-5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/64 transition hover:text-white/85 md:left-6 md:top-6"
            >
              &lt; Back
            </Link>

            <header className="mb-6 pt-1 text-center md:mb-7">
              <h1 className="text-[1.35rem] font-bold tracking-tight text-white md:text-[1.5rem]">Master settings</h1>
              <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-snug text-white/68 md:text-[13px]">
                Choose how Mastrify shapes tone, loudness, width, and clarity before rendering your master.
              </p>
            </header>

            <div className="space-y-6 md:space-y-7">
              <section>
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/66">Mastering style</h3>
                  <p className="mt-1.5 text-[11px] text-white/42">
                    Tap a style · <span className="text-white/55">ⓘ</span> for details
                  </p>
                </div>
                <div className="mt-4">
                  <MasterStylePresetPicker value={stylePreset} onChange={setStylePreset} />
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/66">Loudness target</h3>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/45">
                  Lower LUFS keeps more openness and dynamics. Higher LUFS sounds louder and denser, but leaves less peak headroom.
                </p>
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
                            ? "border-purple-400/50 bg-purple-500/[0.12] text-white shadow-[0_0_14px_rgba(147,51,234,0.14)] ring-1 ring-purple-400/20"
                            : "border-white/[0.06] bg-black/20 text-white/75 hover:border-white/[0.1] hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className={`block text-[11px] font-semibold leading-tight ${active ? "text-white" : "text-white/65"}`}>
                          {o.label}
                        </span>
                        <span className={`mt-0.5 block text-[10px] font-medium tabular-nums ${active ? "text-white/75" : "text-white/60"}`}>
                          {o.lufs} LUFS
                        </span>
                        <span className={`mt-1.5 block text-[9px] leading-snug ${active ? "text-white/58" : "text-white/42"}`}>
                          {o.detail}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/66">Advanced options</h3>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-white/45">
                  Tuned for interactive mastering: small moves stay polished, while the upper range creates clearly audible character changes.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-x-6 md:gap-y-4">
                  <ThinSlider
                    label="Stereo enhancement"
                    description="Controls stereo width and spatial depth."
                    helper={sliderHelper("stereo", stereoEnhance)}
                    value={stereoEnhance}
                    onChange={setStereoEnhance}
                  />
                  <ThinSlider
                    label="Low end control"
                    description="Tightens or enhances bass response."
                    helper={sliderHelper("low", lowEndControl)}
                    value={lowEndControl}
                    onChange={setLowEndControl}
                  />
                  <ThinSlider
                    label="Clarity & presence"
                    description="Adds brightness, vocal clarity, and detail."
                    helper={sliderHelper("clarity", clarityPresence)}
                    value={clarityPresence}
                    onChange={setClarityPresence}
                  />
                </div>
              </section>

            </div>

            <div className="mt-7 flex flex-col items-stretch gap-2.5 border-t border-white/[0.06] pt-6 md:mt-8 md:pt-7">
              <button
                type="button"
                onClick={() => router.push("/master/processing")}
                className="w-full rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] py-3 text-[13px] font-semibold text-white shadow-[0_0_26px_rgba(99,102,241,0.3),0_14px_44px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10 transition hover:brightness-110 md:text-sm"
              >
                Start mastering
              </button>
              <Link href="/master" className="pb-0.5 text-center text-[10px] text-white/62 transition hover:text-white/82">
                ← Change file
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
