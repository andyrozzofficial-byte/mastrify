"use client"

import { useState, useRef, useEffect } from "react"

export default function FlowV2() {

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tab, setTab] = useState<"original" | "mastered">("mastered")
  const [loading, setLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const PREVIEW_LIMIT = 20

  // 🎧 FILE UPLOAD
  const handleFile = (f: File) => {
    setFile(f)
    setAudioUrl(URL.createObjectURL(f))

    // fake AI processing
    setLoading(true)
    setTimeout(() => setLoading(false), 1800)
  }

  // ▶️ PLAY
  const togglePlay = () => {
    if (!audioRef.current) return

    if (audioRef.current.paused) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  // 💰 PREVIEW LIMIT
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const interval = setInterval(() => {
      if (audio.currentTime >= PREVIEW_LIMIT) {
        audio.pause()
        setIsPlaying(false)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [])

  // 🎨 REAL WAVEFORM
  useEffect(() => {
    if (!audioUrl) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const audio = new Audio(audioUrl)
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    const source = audioCtx.createMediaElementSource(audio)

    source.connect(analyser)
    analyser.connect(audioCtx.destination)

    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = canvas.width / bufferLength

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)

        if (tab === "original") {
          gradient.addColorStop(0, "#888")
          gradient.addColorStop(1, "#aaa")
        } else {
          gradient.addColorStop(0, "#a855f7")
          gradient.addColorStop(1, "#3b82f6")
        }

        ctx.fillStyle = gradient

        ctx.fillRect(
          i * barWidth,
          canvas.height - barHeight,
          barWidth - 1,
          barHeight
        )
      }
    }

    draw()

  }, [audioUrl, tab])

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">

      {/* 🌌 BACKGROUND */}
      <div className="absolute inset-0">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_60%)]" />

        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-500/10 blur-[180px]" />

        <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/10 blur-[180px]" />

        <div className="absolute inset-0 bg-black/80" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-12">

        {/* LEFT */}
        <div className="space-y-6">

          <p className="text-xs tracking-[0.3em] text-white/50">
            MASTRIFY
          </p>

          <h1 className="text-5xl font-semibold leading-tight">
            Make your track sound pro ✨
          </h1>

          <p className="text-white/40 text-sm">
            AI-powered mixing & mastering in seconds
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">

            <div className="text-center">
              <p className="text-sm text-white/70">
                Upload your track
              </p>
              <p className="text-xs text-white/40">
                Drag & drop your WAV/MP3 file
              </p>
            </div>

            <label className="block w-full text-center bg-gradient-to-r from-purple-500 to-blue-500 py-3 rounded-xl cursor-pointer font-medium">
              Choose file
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </label>

            {file && (
              <div className="bg-white/5 rounded-xl p-3 text-xs flex justify-between">
                <span>{file.name}</span>
                <span className="text-green-400">✔</span>
              </div>
            )}

            {loading && (
              <div className="text-xs text-blue-400 text-center">
                ⚡ Analyzing & mastering...
              </div>
            )}

          </div>

          <div className="flex gap-6 text-xs text-white/40">
            <span>⭐ 4.9/5</span>
            <span>Instant download</span>
            <span>No subscription</span>
          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-5">

          {/* PLAYER */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">

            <div className="flex justify-between mb-3">

              <p className="text-sm text-white/60">
                Compare your track
              </p>

              <div className="flex text-xs bg-white/10 rounded-full">
                <button
                  onClick={() => setTab("original")}
                  className={`px-3 py-1 rounded-full ${
                    tab === "original" ? "bg-white/20" : ""
                  }`}
                >
                  Original
                </button>

                <button
                  onClick={() => setTab("mastered")}
                  className={`px-3 py-1 rounded-full ${
                    tab === "mastered" ? "bg-blue-500" : ""
                  }`}
                >
                  Mastered
                </button>
              </div>

            </div>

            <canvas
              ref={canvasRef}
              width={500}
              height={80}
              className="w-full h-20 mb-3"
            />

            <button
              onClick={togglePlay}
              className="w-full bg-white/10 py-2 rounded-lg text-sm"
            >
              {isPlaying ? "Pause preview" : "Play preview"}
            </button>

            <p className="text-xs text-red-400 text-center mt-2">
              Preview limited to 20 seconds
            </p>

          </div>

          {/* RESULT */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">

            <div className="flex justify-between mb-4">
              <p className="text-green-400 text-sm font-semibold">
                🚀 Your master is ready
              </p>

              <span className="text-xs bg-white/10 px-2 py-1 rounded">
                73/100
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs mb-5">

              <div>
                <p className="text-white/40 mb-2">Mix</p>
                <p>✔ Stereo widened</p>
                <p>✔ Low end crisp</p>
                <p>✔ Vocals clear</p>
              </div>

              <div>
                <p className="text-white/40 mb-2">Fix</p>
                <p className="text-red-400">+5 dB</p>
                <p className="text-red-400">Limiter</p>
                <p className="text-red-400">Widen</p>
              </div>

              <div>
                <p className="text-white/40 mb-2">Chain</p>
                <p>Gain</p>
                <p>Limiter</p>
                <p>Stereo</p>
              </div>

            </div>

            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-black font-semibold">
              Get your pro master – 5€
            </button>

            <p className="text-xs text-white/40 text-center mt-2">
              Your mastered track will be ready in seconds
            </p>

          </div>

        </div>

      </div>

      {/* AUDIO FIX */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

    </main>
  )
}