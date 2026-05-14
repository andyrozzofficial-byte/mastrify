"use client"
import { motion } from "framer-motion"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import CinematicBackground from "../components/CinematicBackground"
import ScoreRing from "../components/ScoreRing"

export default function Landing() {

  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [count, setCount] = useState(0)
  

  // AUDIO
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<"before" | "after">("before")
  const [progress, setProgress] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const src =
    mode === "before" ? "/audio/before.mp3" : "/audio/after.mp3"

  /* LOAD AUDIO */
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setPlaying(false)
    setProgress(0)

    audio.src = src
    audio.load()
  }, [mode])

  /* PROGRESS */
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

  const handleSeek = (e: any) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width

    audio.currentTime = percent * audio.duration
  }

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true })

      if (count) setCount(count)
    }

    fetchCount()
  }, [])

  const handleSubmit = async () => {
    setErrorMsg("")

    if (!email) return setErrorMsg("Enter an email")
    if (!email.includes("@")) return setErrorMsg("Enter a valid email")

    setLoading(true)

    const { error } = await supabase
      .from("waitlist")
      .insert([{ email }])

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
    setCount(prev => prev + 1)
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
    <main className="relative min-h-screen overflow-hidden bg-black px-6 py-16 text-white md:py-24">
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
        className="pointer-events-none absolute top-0 left-0 right-0 h-[480px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_30%,rgba(139,92,246,0.12),rgba(34,211,238,0.08),rgba(139,92,246,0.12))] blur-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 100, ease: "linear", repeat: Infinity }}
          style={{ transformOrigin: "50% 30%" }}
        />
      </motion.div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-8 md:px-10 md:pt-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent md:text-5xl lg:text-6xl bg-gradient-to-r from-white via-purple-300 to-cyan-300/90 bg-clip-text drop-shadow-[0_0_40px_rgba(139,92,246,0.4)]">
            Mastrify
          </h1>
        </div>

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-5xl lg:text-6xl xl:text-7xl bg-gradient-to-r from-white via-purple-50 to-cyan-200/90 bg-clip-text">
              Fix your mix{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">before</span>
              <br />
              you master it.
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-white/55 lg:mx-0 lg:max-w-lg">
              AI pinpoints loudness, balance, and stereo issues — then optional mastering when your mix is ready.
            </p>
            <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:max-w-none sm:flex-row lg:justify-start">
              <Link
                href="/analyze"
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-cyan-500 px-8 py-4 text-base font-semibold text-white shadow-[0_22px_60px_rgba(139,92,246,0.4)] transition hover:brightness-110"
              >
                Analyze my mix — it&apos;s free
              </Link>
              <Link
                href="/master"
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.05] px-8 py-4 text-base font-semibold text-white/90 backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-white/[0.09] hover:shadow-[0_0_30px_rgba(34,211,238,0.12)]"
              >
                Try mastering
              </Link>
            </div>
            <p className="mt-5 text-sm text-white/35">No signup for analysis · Premium mastering flow</p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-purple-500/25 via-transparent to-cyan-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-b from-white/[0.08] to-black/60 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Analysis preview</span>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/90 ring-1 ring-emerald-400/30">
                  Demo
                </span>
              </div>
              <div className="mt-8 flex flex-col items-center gap-10 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                <ScoreRing value={44} size={148} />
                <div className="w-full flex-1 space-y-4">
                  {[
                    ["Low output level", "text-rose-400"],
                    ["Harsh highs", "text-amber-300"],
                    ["Stereo OK", "text-emerald-400"],
                  ].map(([label, col], idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_currentColor] ${col}`} />
                      <span className="text-sm text-white/80">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-16 w-full max-w-xl">
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

      {/* PLAYER */}
      <div className="mt-24 w-full max-w-5xl md:mt-32">

        <h2 className="text-center text-2xl mb-6">
          Hear the difference
        </h2>

        <div className="relative">

          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/14 to-blue-500/12 blur-2xl rounded-2xl" />

      <div className="relative bg-white/[0.05] border border-white/12 rounded-2xl p-8 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.5)] md:p-10">

            {/* TOGGLE */}
            <div className="flex justify-center gap-4 mb-6">
              {["before", "after"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m as any)}
                  className={`px-6 py-2 rounded-full transition ${
                    mode === m
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_18px_rgba(139,92,246,0.62)]"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* PLAYER */}
            <div className="relative h-20 flex items-center">

              {/* WAVEFORM */}
              <div
                onClick={handleSeek}
                className="absolute inset-0 flex items-center cursor-pointer"
              >
                <div className="w-full flex justify-between text-[6px] text-white/20">
                  {Array.from({ length: 120 }).map((_, i) => (
                    <span key={i}>|</span>
                  ))}
                </div>

                <div
                  className="absolute left-0 h-[2px] bg-gradient-to-r from-purple-400 to-blue-400 shadow-[0_0_12px_rgba(139,92,246,0.45)]"
                  style={{ width: `${progress}%` }}
                />

                <div
                  className="absolute w-5 h-5 rounded-full 
bg-white 
shadow-[0_0_25px_white] 
border border-white/50"
                  style={{ left: `${progress}%` }}
                />
              </div>

              {/* PLAY */}
              <div className="absolute left-1/2 -translate-x-1/2">
                <motion.button
  onClick={togglePlay}
  onTouchStart={() => {}}
  animate={
  playing
    ? { scale: 1 }
    : { scale: [1, 1.15, 1] }
}
  transition={{
    duration: 1.8,
    repeat: Infinity,
  }}
  className="w-20 h-20 rounded-full 
  bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 
  flex items-center justify-center 
  hover:scale-110 active:scale-95 transition 
  shadow-[0_0_70px_rgba(139,92,246,0.78)]"
>
  {playing ? (
  <div className="flex gap-[3px]">
    <div className="w-[3px] h-4 bg-white rounded-sm" />
    <div className="w-[3px] h-4 bg-white rounded-sm" />
  </div>
) : (
  <svg
    viewBox="0 0 24 24"
    className="w-6 h-6 fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
  >
    <polygon points="5,3 19,12 5,21" />
  </svg>
)}
</motion.button>
              </div>

            </div>

            <p className="mt-6 text-center text-sm text-white/50">
              <span className="block">Before: muddy, harsh, flat</span>
              <span className="block mt-1">After: clean, punchy, wide</span>
            </p>

          </div>
        </div>
      </div>

      {/* ANALYSIS + FEEDBACK (oförändrat) */}

{/* ANALYSIS */}
<div className="mt-20 grid w-full max-w-5xl grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">

  {[
    ["LUFS", "-17", "target -9"],
    ["BASS", "Weak"],
    ["HIGHS", "Harsh"],
    ["STEREO", "Narrow"],
  ].map((item, i) => (
    <div key={i} className="relative">

      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/14 to-blue-500/12 blur-xl rounded-xl" />

      <div className="relative h-[120px] flex flex-col justify-center bg-white/[0.04] border border-white/10 rounded-xl p-5 text-center backdrop-blur-xl hover:scale-[1.05] transition shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-[0_18px_50px_rgba(0,0,0,0.52)]">
        <p className="text-xs text-white/40">{item[0]}</p>
        <p className="text-lg font-semibold mt-2">{item[1]}</p>
        {item[2] && <p className="text-xs text-white/40">{item[2]}</p>}
      </div>

    </div>
  ))}

</div>

{/* FEEDBACK */}
<div className="mt-16 max-w-xl w-full">

  <h2 className="text-center text-2xl mb-6">
    What needs fixing
  </h2>

  <div className="relative">

    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/14 to-blue-500/12 blur-2xl rounded-2xl" />

    <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-[0_20px_65px_rgba(0,0,0,0.55)]">

      <ul className="space-y-3 text-white/70">
        <li>• Your drop lacks low-end weight</li>
        <li>• High frequencies are too sharp</li>
        <li>• Mix feels too narrow</li>
      </ul>

    </div>

  </div>

    </div>

</div>

    </main>

    
  )
}