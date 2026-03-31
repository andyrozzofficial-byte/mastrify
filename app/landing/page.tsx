"use client"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"

export default function Landing() {
  const router = useRouter()

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
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">

      <audio
  ref={audioRef}
  src={src}
  playsInline
  
  preload="auto"
  controls={false}
  controlsList="nodownload nofullscreen noremoteplayback"
  style={{ display: "none" }}
/>

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.35),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.25),transparent_60%)]" />
      </div>

      {/* 🔥 MASRIFY LOGO TEXT */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight 
bg-gradient-to-r from-white via-purple-300 to-purple-500 
bg-clip-text text-transparent 
drop-shadow-[0_0_35px_rgba(139,92,246,0.8)]">
          Mastrify
        </h1>
        
      </div>

      {/* 🔥 HEADLINE */}
      <div className="text-center max-w-2xl">

        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight 
bg-gradient-to-r from-white via-purple-200 to-blue-400 
bg-clip-text text-transparent 
drop-shadow-[0_0_40px_rgba(139,92,246,0.6)]">
  Fix your mix before <br /> you master it.
</h1>

        <p className="mt-6 text-white/70 text-lg">
          AI shows exactly what's wrong with your track — before you release it.
        </p>

        {/* INPUT */}
        <div className="mt-10 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-xl rounded-full" />

          <div className="relative flex items-center bg-white/[0.05] border border-white/10 rounded-full p-2 backdrop-blur-xl">

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your email"
              className="bg-transparent px-4 py-2 flex-1 outline-none"
            />

            <button
  onClick={async () => {
  try {
    if (email && email.includes("@")) {
      await supabase.from("waitlist").insert([{ email }])
    }
  } catch (err) {
    console.log("waitlist error", err)
  }

  router.push("/analyze")
}}
  className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:scale-105 active:scale-95 transition"
>
  Try it now
</button>

          </div>
        </div>

        {count > 0 ? (
  <p className="text-xs text-white/30 mt-3">
    Join {count}+ producers already testing Mastrify
  </p>
) : (
  <p className="text-xs text-white/20 mt-3">
    Fix your mix in seconds
  </p>
)}

      </div>

      {/* PLAYER */}
      <div className="mt-16 md:mt-20 w-full max-w-3xl">

        <h2 className="text-center text-2xl mb-6">
          Hear the difference
        </h2>

        <div className="relative">

          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-2xl rounded-2xl" />

          <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-2xl shadow-[0_0_60px_rgba(139,92,246,0.25)]">

            {/* TOGGLE */}
            <div className="flex justify-center gap-4 mb-6">
              {["before", "after"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m as any)}
                  className={`px-6 py-2 rounded-full transition ${
                    mode === m
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_15px_rgba(139,92,246,0.6)]"
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
                  className="absolute left-0 h-[2px] bg-gradient-to-r from-purple-400 to-blue-400 shadow-[0_0_20px_rgba(139,92,246,0.8)]"
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
  shadow-[0_0_60px_rgba(139,92,246,0.7)]"
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

      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-xl rounded-xl" />

      <div className="relative h-[120px] flex flex-col justify-center bg-white/[0.04] border border-white/10 rounded-xl p-5 text-center backdrop-blur-xl hover:scale-[1.05] transition shadow-[0_0_25px_rgba(139,92,246,0.25)]">
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

    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-2xl rounded-2xl" />

    <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(139,92,246,0.25)]">

      <ul className="space-y-3 text-white/70">
        <li>• Your drop lacks low-end weight</li>
        <li>• High frequencies are too sharp</li>
        <li>• Mix feels too narrow</li>
      </ul>

    </div>

  </div>

</div>

    </main>

    
  )
}