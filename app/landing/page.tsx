"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import type { ReactNode } from "react"
import { supabase } from "../../lib/supabase"
import CinematicBackground from "../components/CinematicBackground"
import ScoreRing from "../components/ScoreRing"

const previewRows = [
  { label: "Low end", status: "Needs work", dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.55)]", statusClass: "text-rose-400" },
  {
    label: "Too much dynamic range",
    status: "Major issue",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]",
    statusClass: "text-amber-300",
  },
  { label: "Stereo image", status: "Good", dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]", statusClass: "text-emerald-400" },
  { label: "Loudness", status: "Good", dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]", statusClass: "text-emerald-400" },
]

const dawLogos = ["Ableton", "FL Studio", "Logic Pro", "Pro Tools", "Studio One"]

function HeroCheck({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[14px] text-white/65 md:text-[15px]">
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.05] text-[9px] font-bold text-cyan-200/95"
        aria-hidden
      >
        ✓
      </span>
      <span>{children}</span>
    </div>
  )
}

export default function Landing() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [count, setCount] = useState(0)

  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<"before" | "after">("before")
  const [progress, setProgress] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const src = mode === "before" ? "/audio/before.mp3" : "/audio/after.mp3"

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setPlaying(false)
    setProgress(0)

    audio.src = src
    audio.load()
  }, [mode])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const update = () => {
      if (!audio.duration) return
      setProgress((audio.currentTime / audio.duration) * 100)
    }

    audio.addEventListener("timeupdate", update)
    return () => audio.removeEventListener("timeupdate", update)
  }, [])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width

    audio.currentTime = percent * audio.duration
  }

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true })

      if (count) setCount(count)
    }

    fetchCount()
  }, [])

  const handleSubmit = async () => {
    setErrorMsg("")

    if (!email) return setErrorMsg("Enter an email")
    if (!email.includes("@")) return setErrorMsg("Enter a valid email")

    setLoading(true)

    const { error } = await supabase.from("waitlist").insert([{ email }])

    setLoading(false)

    if (error) {
      if (error.message.includes("duplicate")) {
        setErrorMsg("You're already on the list 😉")
      } else {
        setErrorMsg("Something went wrong")
      }
      return
    }

    setSubmitted(true)
    setCount((prev) => prev + 1)
    setEmail("")
    setTimeout(() => setSubmitted(false), 3000)
  }

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      if (playing) {
        audio.pause()
        setPlaying(false)
      } else {
        await audio.play()
        setPlaying(true)
      }
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-5 pb-24 pt-6 text-white md:px-10 md:pb-32 md:pt-10">
      <CinematicBackground intensity="strong" />

      <audio
        ref={audioRef}
        src={src}
        playsInline
        preload="auto"
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback"
        style={{ display: "none" }}
      />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-0 h-[520px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.16),transparent_55%),radial-gradient(ellipse_50%_45%_at_85%_25%,rgba(37,99,235,0.1),transparent_50%)]"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
        />
      </motion.div>

      <div className="relative z-10 mx-auto w-full max-w-[1240px]">
        {/* Hero — ~60/40 split, reference layout */}
        <div className="grid items-start gap-12 pt-2 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-x-14 lg:gap-y-10 lg:pt-6">
          <div className="text-center lg:max-w-none lg:pr-4 lg:text-left">
            <div className="inline-flex rounded-full border border-purple-500/35 bg-purple-500/[0.08] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-200/95 shadow-[0_0_24px_rgba(168,85,247,0.28)]">
              AI powered
            </div>

            <h1 className="mt-7 text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]">
              Fix your mix{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">before</span>
              <br />
              you master it.
            </h1>

            <p className="mx-auto mt-7 max-w-[26rem] text-[15px] leading-relaxed text-white/48 sm:text-base lg:mx-0 lg:max-w-[28rem] lg:text-[17px] lg:leading-relaxed">
              AI shows you exactly what&apos;s holding your track back — before you release it.
            </p>

            <div className="mx-auto mt-9 flex w-full max-w-[26rem] flex-col gap-3.5 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:mt-10 lg:max-w-none lg:justify-start">
              <Link
                href="/analyze"
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#2563eb] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_0_40px_rgba(99,102,241,0.45),0_18px_50px_rgba(0,0,0,0.35)] transition hover:brightness-110 sm:min-w-[220px] sm:flex-none lg:px-9 lg:py-4 lg:text-base"
              >
                Analyze my mix — It&apos;s free
              </Link>
              <Link
                href="/master"
                className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-white/22 bg-transparent px-7 py-3.5 text-[15px] font-semibold text-white/95 transition hover:border-white/35 hover:bg-white/[0.06] hover:shadow-[0_0_28px_rgba(255,255,255,0.06)] sm:min-w-[180px] sm:flex-none lg:px-8 lg:py-4 lg:text-base"
              >
                Try Mastering
              </Link>
            </div>

            <div className="mx-auto mt-9 flex max-w-md flex-col items-start gap-3.5 sm:mx-auto sm:max-w-lg sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3 lg:mx-0 lg:mt-10 lg:justify-start">
              <HeroCheck>Free analysis</HeroCheck>
              <HeroCheck>Instant feedback</HeroCheck>
              <HeroCheck>No signup</HeroCheck>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:mx-0 lg:max-w-none lg:pt-2">
            <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-purple-600/20 via-transparent to-cyan-500/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[22px] border border-white/[0.11] bg-gradient-to-b from-white/[0.07] to-black/[0.72] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_36px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:rounded-3xl md:p-9">
              <div className="flex flex-col-reverse items-center gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p className="max-w-[15rem] text-center text-[15px] leading-snug text-white/72 sm:max-w-[13.5rem] sm:text-left md:text-[16px] md:leading-snug">
                  Your mix is <span className="font-semibold text-white">44%</span> ready for release
                </p>
                <ScoreRing value={44} size={152} variant="percent" />
              </div>

              <div className="mt-8 space-y-0 divide-y divide-white/[0.07] rounded-xl border border-white/[0.06] bg-black/25">
                {previewRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5 md:py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} />
                      <span className="truncate text-[13px] text-white/82 md:text-sm">{row.label}</span>
                    </div>
                    <span className={`shrink-0 text-[12px] font-medium md:text-[13px] ${row.statusClass}`}>{row.status}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/analyze"
                className="mt-7 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-purple-500/35 bg-gradient-to-b from-white/[0.07] to-black/60 text-[14px] font-semibold text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.35)] transition hover:border-purple-400/45 hover:brightness-105"
              >
                Analyze your mix
              </Link>
            </div>
          </div>
        </div>

        {/* Divider — centered purple glow “hot spot” */}
        <div className="relative mx-auto mt-20 max-w-[1240px] md:mt-24 lg:mt-28">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[3px] w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-fuchsia-400/90 to-transparent opacity-90 blur-[6px] shadow-[0_0_28px_rgba(217,70,239,0.85),0_0_60px_rgba(168,85,247,0.45)]"
            aria-hidden
          />
        </div>

        {/* Trusted by + DAW row */}
        <div className="mx-auto mt-12 max-w-[1240px] text-center md:mt-14">
          <p className="text-[13px] text-white/38 md:text-sm">Trusted by 8,000+ producers and artists worldwide</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:mt-10 md:gap-x-14 lg:gap-x-16">
            {dawLogos.map((name) => (
              <span
                key={name}
                className="select-none text-[11px] font-semibold uppercase tracking-[0.18em] text-white/22 transition hover:text-white/32 md:text-xs"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Waitlist — unchanged behavior */}
        <div className="relative mx-auto mt-20 w-full max-w-xl md:mt-24">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/25 to-cyan-500/20 blur-2xl" />
          <div className="relative flex flex-col gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.05] p-2 backdrop-blur-xl sm:flex-row sm:items-center">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Email for product updates"
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "…" : "Join waitlist"}
            </button>
          </div>
          {errorMsg && <p className="mt-2 text-center text-xs text-rose-400">{errorMsg}</p>}
          {submitted && <p className="mt-2 text-center text-xs text-emerald-400">You are on the list.</p>}
          {count > 0 ? (
            <p className="mt-3 text-center text-xs text-white/30">Join {count}+ producers exploring Mastrify</p>
          ) : (
            <p className="mt-3 text-center text-xs text-white/25">Ship cleaner mixes, faster</p>
          )}
        </div>

        {/* Hear the difference */}
        <div className="mt-24 w-full md:mt-32">
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">Hear the difference</h2>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/14 to-blue-500/12 blur-2xl" />

            <div className="relative rounded-2xl border border-white/12 bg-white/[0.05] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:p-10">
              <div className="mb-6 flex justify-center gap-4">
                {(["before", "after"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full px-6 py-2 transition ${
                      mode === m
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_18px_rgba(139,92,246,0.62)]"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="relative flex h-20 items-center">
                <div onClick={handleSeek} className="absolute inset-0 flex cursor-pointer items-center">
                  <div className="flex w-full justify-between text-[6px] text-white/20">
                    {Array.from({ length: 120 }).map((_, i) => (
                      <span key={i}>|</span>
                    ))}
                  </div>

                  <div
                    className="absolute left-0 h-[2px] bg-gradient-to-r from-purple-400 to-blue-400 shadow-[0_0_12px_rgba(139,92,246,0.45)]"
                    style={{ width: `${progress}%` }}
                  />

                  <div
                    className="absolute h-5 w-5 rounded-full border border-white/50 bg-white shadow-[0_0_25px_white]"
                    style={{ left: `${progress}%` }}
                  />
                </div>

                <div className="absolute left-1/2 -translate-x-1/2">
                  <motion.button
                    type="button"
                    onClick={togglePlay}
                    onTouchStart={() => {}}
                    animate={playing ? { scale: 1 } : { scale: [1, 1.15, 1] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                    }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 shadow-[0_0_70px_rgba(139,92,246,0.78)] transition hover:scale-110 active:scale-95"
                  >
                    {playing ? (
                      <div className="flex gap-[3px]">
                        <div className="h-4 w-[3px] rounded-sm bg-white" />
                        <div className="h-4 w-[3px] rounded-sm bg-white" />
                      </div>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-white/50">
                <span className="block">Before: muddy, harsh, flat</span>
                <span className="mt-1 block">After: clean, punchy, wide</span>
              </p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-20 grid w-full grid-cols-2 gap-5 md:mt-24 md:grid-cols-4 md:gap-6">
          {[
            ["LUFS", "-17", "target -9"],
            ["BASS", "Weak"],
            ["HIGHS", "Harsh"],
            ["STEREO", "Narrow"],
          ].map((item, i) => (
            <div key={item[0]} className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/14 to-blue-500/12 blur-xl" />

              <div className="relative flex h-[120px] flex-col justify-center rounded-xl border border-white/10 bg-white/[0.04] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_rgba(0,0,0,0.52)] backdrop-blur-xl transition hover:scale-[1.05]">
                <p className="text-xs text-white/40">{item[0]}</p>
                <p className="mt-2 text-lg font-semibold">{item[1]}</p>
                {item[2] && <p className="text-xs text-white/40">{item[2]}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="mx-auto mt-16 w-full max-w-xl">
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">What needs fixing</h2>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/14 to-blue-500/12 blur-2xl" />

            <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_65px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <ul className="space-y-3 text-white/70">
                <li>• Your drop lacks low-end weight</li>
                <li>• High frequencies are too sharp</li>
                <li>• Mix feels too narrow</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
