"use client"

import { useState, useRef, useEffect } from "react"
import axios from "axios"



/* 🔥 AUDIO PLAYER (UTANFÖR APP) */
const AudioPlayer = ({ src, label }: { src: string; label: string }) => {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  


  const audioRef = useRef<HTMLAudioElement>(null)

  /* 🔁 RESET när ny låt */
  useEffect(() => {
    setPlaying(false)
    setProgress(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [src])
  
  useEffect(() => {
  const audio = audioRef.current
  if (!audio) return

  // 👇 DEN SKA LIGGA HÄR
  const limitPlayback = () => {
    if (audio.currentTime >= 60) {
      audio.pause()
      setPlaying(false)
    }
  }

  audio.addEventListener("timeupdate", limitPlayback)

  return () => {
    audio.removeEventListener("timeupdate", limitPlayback)
  }
}, [])

useEffect(() => {
  const audio = audioRef.current
  if (!audio) return

  audio.addEventListener("timeupdate", () => {
    if (audio.currentTime >= 60) {
      audio.pause()
      setPlaying(false)
    }
  })
}, [])

  const togglePlay = () => {
  if (!audioRef.current) return

  const audio = audioRef.current

  if (playing) {
    audio.pause()
  } else {
    if (audio.currentTime === 0) {
      audio.currentTime = 30
    }

    audio.play()
  }

  setPlaying(!playing)
}

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const current = audioRef.current.currentTime
    const total = audioRef.current.duration || 1
    setProgress((current / total) * 100)
  }

  return (
  <div
    className={`
      rounded-2xl p-5 flex items-center gap-4 border
      transition-all duration-500 ease-out backdrop-blur-xl hover:scale-[1.01]
      ${
        label.includes("MASTER")
          ? "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-400/30 ring-1 ring-purple-400/20 animate-[softGlow_4s_ease-in-out_infinite]"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      }
    `}
  >
    {/* PLAY BUTTON */}
    <button
      onClick={togglePlay}
      className={`
        relative w-12 h-12 rounded-full flex items-center justify-center
        transition-all duration-300
        ${
          label.includes("MASTER")
            ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
            : "bg-white text-black"
        }
        hover:scale-110 active:scale-95
      `}
    >
      {/* soft glow bakom knappen */}
      {label.includes("MASTER") && (
        <div className="absolute inset-0 rounded-full blur-lg bg-purple-500/20" />
      )}

      <div className="relative z-10">
        {playing ? "❚❚" : "▶"}
      </div>
    </button>

    {/* INFO + PROGRESS */}
    <div className="flex-1 space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-xs text-gray-400">
  {Math.round(progress)}%
</p>
      </div>

      {/* PROGRESS BAR */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`
            h-full transition-all duration-300
            ${
              label.includes("MASTER")
                ? "bg-gradient-to-r from-purple-400 to-blue-400"
                : "bg-white/30"
            }
          `}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>

    {/* AUDIO */}
    <audio
      ref={audioRef}
      src={src}
      onTimeUpdate={handleTimeUpdate}
    />
  </div>
)
}

export default function App() {

  const calculateScore = (a: any) => {
    if (!a) return null

    let score = 75

    if (a.lufs > -7) score -= 5
    else if (a.lufs > -10) score -= 3
    else if (a.lufs < -18) score -= 3

    if (a.dynamicRange < 4) score -= 5
    else if (a.dynamicRange < 7) score -= 2

    if (a.stereoWidth < 0.25) score -= 4
    else if (a.stereoWidth < 0.4) score -= 2

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const [file, setFile] = useState<File | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [beforeUrl, setBeforeUrl] = useState("")
  const [style, setStyle] = useState("spotify")
  const [progress, setProgress] = useState(0)
  const [analysis, setAnalysis] = useState<any>(null)
  const [aiStep, setAiStep] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setProgress(0)

    const steps = [
  "Analyzing waveform...",
  "Balancing frequencies...",
  "Enhancing stereo width...",
  "Optimizing loudness...",
  "Finalizing master..."
]

let i = 0

const aiInterval = setInterval(() => {
  setAiStep(steps[i])
  i++
  if (i >= steps.length) i = steps.length - 1
}, 1200)

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.random() * 10))
    }, 300)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("style", style)
    formData.append("targetLufs", "-10")

    try {
      const resPromise = axios.post(
  "http://127.0.0.1:3002/master",
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  }
)

// 🔥 fake AI delay (viktigt)
await new Promise((resolve) => setTimeout(resolve, 4000))

const res = await resPromise

      clearInterval(interval)
      setProgress(100)

      setResult(`http://127.0.0.1:3002${res.data.after}`)
      setBeforeUrl(`http://127.0.0.1:3002${res.data.before}`)
      setAnalysis(res.data.analysis)

    } catch (err) {
      console.log(err)
      alert("Error processing track")
      clearInterval(interval)
      clearInterval(aiInterval)
      setAiStep("")
    }

    setLoading(false)
  }

  const handleWaitlist = async () => {
    if (!email) return

    try {
      await axios.post("http://127.0.0.1:3002/waitlist", { email })
      setSubmitted(true)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center pt-32 pb-32 relative overflow-hidden">
      <div className="absolute top-6 left-6 z-20">
  <img
    src="/logo.png"
    alt="Mastrify"
    className="h-5
   w-auto opacity-80 hover:opacity-100 transition"
  />
</div>

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,119,198,0.2),transparent_70%)]" />
      <div className="absolute w-[700px] h-[700px] bg-purple-500/30 blur-[180px] rounded-full top-[-200px]" />
      <div className="absolute w-[600px] h-[600px] bg-blue-400/20 blur-[180px] rounded-full bottom-[-200px]" />

      <div className="relative z-10 w-full max-w-5xl px-6">

        {/* TITLE */}
        <h1 className="text-7xl font-bold text-center mb-3 tracking-tight bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
  Mastrify
</h1>

        <p className="text-center text-gray-400 mb-4 text-sm">
          AI mastering for modern artists
        </p>

        <p className="text-center text-purple-300 text-xs mb-12">
          Upload your track → hear it like Spotify
        </p>

        {/* CARD */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-md shadow-[0_0_40px_rgba(139,92,246,0.15),0_0_80px_rgba(59,130,246,0.08)] shadow-[0_0_120px_rgba(139,92,246,0.25)] hover:shadow-[0_0_160px_rgba(139,92,246,0.35)] transition-all duration-500 relative">

              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl rounded-3xl -z-10" />

          {/* UPLOAD */}
          <div
            onClick={() => inputRef.current?.click()}
            className="border border-white/20 shadow-[0_0_30px_rgba(168,85,247,0.25)] rounded-2xl h-[240px] flex items-center justify-center text-center cursor-pointer 
            transition hover:border-purple-400 hover:bg-white/10 hover:shadow-[0_0_60px_rgba(120,119,198,0.4)]"
          >
            {file ? (
              <p className="text-sm text-white">{file.name}</p>
            ) : (
              <>
                <p className="text-gray-300 text-sm">Drop your track</p>
                <p className="text-gray-500 text-xs">or click to upload</p>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* STYLE */}
          <div className="mt-8 grid grid-cols-4 gap-2">
            {["spotify", "club", "loud", "warm"].map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`py-2 rounded-xl text-xs transition ${
                  style === s
                    ? "bg-white text-black shadow-lg scale-105"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* BUTTON */}
          <button
            onClick={handleUpload}
            className="mt-8 w-full bg-white text-black py-4 rounded-2xl font-medium text-sm 
            transition hover:scale-[1.02] shadow-lg shadow-white/20"
          >
            {loading ? "AI Processing..." : "Master Track"}
          </button>

          {/* PROGRESS */}
{loading && (
  <div className="mt-6 text-center space-y-3">
    
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 transition-all duration-700 ease-out animate-[gradientMove_4s_linear_infinite]"
        style={{
          width: `${progress}%`,
          backgroundSize: "200% 100%"
        }}
      />
    </div>

    <p className="text-sm text-purple-300 animate-pulse">
      {aiStep}
    </p>

  </div>
)}

          {/* RESULT */}
          {result && (
            <div className="mt-10 space-y-6">

              <div className="text-center">
                <p className="text-sm text-purple-300 font-medium">
                  AI finished mastering your track
                </p>
              </div>

              <AudioPlayer src={result} label="✨ MASTERED" />

              {beforeUrl && (
                <AudioPlayer src={beforeUrl} label="Original" />
              )}

              {analysis && (
  <>
    {(() => {
      const score = calculateScore(analysis!) ?? 0

      return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">

          <p className="text-sm text-purple-300 font-medium text-center">
            AI Mix Analysis
          </p>

          <div className="mt-4 text-center">
            <p className="text-sm text-purple-300">Mix Score</p>
            <p className="text-xs text-purple-300 mt-4 mb-1">
  AI Feedback
</p>
<div className="mt-4 space-y-2 text-xs text-gray-300 text-left"></div>

            <p
  className={`text-2xl font-bold ${
    score >= 80
      ? "text-green-400"
      : score >= 60
      ? "text-yellow-400"
      : "text-red-400"
  }`}
>
  {score}/100
</p>

<p className="text-sm text-purple-300 mt-2">
  {score >= 80
    ? "Ready for release"
    : score >= 60
    ? "Good mix – minor improvements needed"
    : "Needs work – mix could be improved"}
</p>

          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Loudness</p>
            <p className="text-xs">
              {analysis.lufs?.toFixed(1)} LUFS
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Dynamics</p>
            <p className="text-xs">
              {analysis.dynamicRange?.toFixed(1)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Stereo Width</p>
            <p className="text-xs">
              {Math.round((analysis.stereoWidth ?? 0) * 100)}%
            </p>

            {/* 🔥 AI FEEDBACK */}
{/* AI FEEDBACK */}

<p className="text-sm text-purple-300 mt-6 mb-2 font-semibold">
  AI Feedback
</p>

{/* WARNINGS */}
<div className="space-y-1 text-yellow-300 text-xs">

  {(analysis.lufs ?? 0) > -10 && (
    <p>⚠️ Too loud for streaming (Spotify target ≈ -14 LUFS)</p>
  )}

  {(analysis.lufs ?? 0) < -16 && (
    <p>⚠️ Too quiet – increase loudness</p>
  )}

  {(analysis.dynamicRange ?? 0) < 6 && (
    <p>⚠️ Low dynamics – mix may feel flat</p>
  )}

  {(analysis.dynamicRange ?? 0) > 14 && (
    <p>⚠️ Very high dynamics – may sound inconsistent</p>
  )}

  {(analysis.stereoWidth ?? 0) < 0.4 && (
    <p>⚠️ Narrow stereo image – widen your mix</p>
  )}

  {(analysis.stereoWidth ?? 0) > 0.9 && (
    <p>⚠️ Too wide – possible phase issues</p>
  )}

</div>

{/* POSITIVE */}
<div className="space-y-1 text-green-400 text-xs mt-2">

  {score >= 80 && (
    <p>✔ Clean, balanced mix – ready for release</p>
  )}

  {score >= 60 && score < 80 && (
    <p>✔ Solid mix – small improvements can make it shine</p>
  )}

</div>

{/* AI FIX SUGGESTIONS */}

<p className="text-sm text-purple-300 mt-6 mb-1 font-semibold">
  🛠 Fix Suggestions
</p>
<p className="text-xs text-white/50 mb-2">
  AI recommends the following improvements:
</p>

<div className="space-y-1 text-xs text-white/80">

  {(analysis.lufs ?? 0) > -10 && (
    <p><span className="text-purple-400">→</span> Reduce limiter by -2dB to match streaming levels</p>
  )}

  {(analysis.lufs ?? 0) > -10 && (
    <p><span className="text-purple-400">→</span> Lower master gain slightly (-1 to -2 dB)</p>
  )}

  {(analysis.lufs ?? 0) < -16 && (
    <p><span className="text-purple-400">→</span> Increase loudness using a limiter or gain staging</p>
  )}

  {(analysis.dynamicRange ?? 0) < 6 && (
    <p><span className="text-purple-400">→</span> Add more dynamics using transient shaping or automation</p>
  )}

  {(analysis.dynamicRange ?? 0) > 14 && (
    <p><span className="text-purple-400">→</span> Control dynamics with light compression (2:1 ratio)</p>
  )}

  {(analysis.stereoWidth ?? 0) < 0.4 && (
    <p><span className="text-purple-400">→</span> Widen stereo image using stereo imager or panning</p>
  )}

  {(analysis.stereoWidth ?? 0) > 0.9 && (
    <p><span className="text-purple-400">→</span> Reduce stereo width to avoid phase issues</p>
  )}

</div>
          </div>

        </div>
      )
    })()}
  </>
)}

              {unlocked ? (
  <a
    href={result}
    download
    className="block w-full text-center bg-white text-black py-3 rounded-xl font-medium text-sm"
  >
    ⬇️ Download Full Track
  </a>
) : (
  <p className="text-center text-gray-500 text-sm">
    🔒 Download locked – unlock to export
  </p>
)}

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-sm mb-2">Unlock full quality master</p>

                <button
  onClick={() => window.location.href = "/pricing"}
  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 py-3 rounded-xl"
>
  🔓 Unlock Download
</button>

                <p className="text-xs text-gray-500 mt-2">
                  Free preview available • Full export locked
                </p>
              </div>

            </div>
          )}

        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Powered by AI
        </p>

      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">

          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl w-[300px] text-center">

            {!submitted ? (
              <>
                <h2 className="mb-3 text-lg">Join early access</h2>

                <input
                  placeholder="your email"
                  className="w-full p-2 rounded bg-black/40 mb-3 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <button
                  onClick={handleWaitlist}
                  className="w-full bg-white text-black py-2 rounded"
                >
                  Join Waitlist
                </button>
              </>
            ) : (
              <p className="text-sm">🔥 You're in. Launch soon.</p>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 text-xs text-gray-400"
            >
              close
            </button>

          </div>

        </div>
      )}

    </main>
  )
}
