"use client"
import { motion } from "framer-motion"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import CinematicBackground from "../components/CinematicBackground"

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

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent md:text-5xl bg-gradient-to-r from-white via-purple-300 to-cyan-300/90 bg-clip-text drop-shadow-[0_0_35px_rgba(139,92,246,0.45)]">
            Mastrify
          </h1>
        </div>

        <div className="max-w-3xl text-center">
          <h2 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-transparent md:text-6xl lg:text-7xl bg-gradient-to-r from-white via-purple-100 to-cyan-200/85 bg-clip-text">
            Fix your mix before <br className="hidden sm:block" />
            you master it.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/55 md:text-lg">
            AI shows exactly what is holding your track back — then optional mastering when you are ready.
          </p>

          <div className="mt-10 flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/analyze"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(139,92,246,0.35)] transition hover:brightness-110"
            >
              Free analysis
            </Link>
            <Link
              href="/master"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:border-cyan-400/35 hover:bg-white/[0.07]"
            >
              AI mastering
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/35">No signup for analysis · Premium flow for masters</p>
        </div>

        {/* Waitlist */}
        <div className="relative mt-14 w-full max-w-lg">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/25 to-cyan-500/20 blur-2xl" />
          <div className="relative flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 backdrop-blur-xl sm:flex-row sm:items-center">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Email for product updates"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
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
      <div className="mt-24 md:mt-28 w-full max-w-3xl">

        <h2 className="text-center text-2xl mb-6">
          Hear the difference
        </h2>

        <div className="relative">

          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/14 to-blue-500/12 blur-2xl rounded-2xl" />

          <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shadow-[0_22px_70px_rgba(0,0,0,0.55)]">

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
<div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full">

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