"use client"

import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"

export default function Waveform({ file }: { file: File }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!file || !containerRef.current) return

    const url = URL.createObjectURL(file)

    // 🎧 AUDIO (DETTA STYR ALLT)
    const audio = new Audio(url)
    audioRef.current = audio

    // 🔥 destroy previous waveform
    if (waveRef.current) {
      try {
        waveRef.current.destroy()
      } catch (e) {}
      waveRef.current = null
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(255,255,255,0.08)",
      progressColor: "#a78bfa",
      cursorColor: "#ffffff",
      height: 80,
    })

    waveRef.current = ws
    ws.load(url)

    // ▶️ PLAY / PAUSE (STYR AUDIO, INTE WS)
    const handleClick = () => {
      if (audio.paused) {
        audio.play()
        setIsPlaying(true)
      } else {
        audio.pause()
        setIsPlaying(false)
      }
    }

    ws.on("click", handleClick)

    // 🔒 30 SEK STOP (NU FUNKAR DET)
    const interval = setInterval(() => {
      if (!audio) return
      if (audio.paused) return

      if (audio.currentTime >= 30) {
        audio.pause()
        audio.currentTime = 0
        setIsPlaying(false)
      }
    }, 200)

    return () => {
      clearInterval(interval)

      if (waveRef.current) {
        try {
          waveRef.current.destroy()
        } catch (e) {}
        waveRef.current = null
      }

      audio.pause()
      audio.src = ""

      URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <div className="mt-6">
      <div ref={containerRef} />

      <p className="text-center text-sm text-gray-400 mt-2">
        🔒 Preview only – unlock full track
      </p>
    </div>
  )
}