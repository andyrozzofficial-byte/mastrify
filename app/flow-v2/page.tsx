"use client"

import { useState } from "react"

export default function FlowPage() {
  const [analysis, setAnalysis] = useState<any>(null)

  async function handleUpload(e: any) {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("https://mastrify-production.up.railway.app/analyze", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    setAnalysis(data)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070d] via-[#0b0f1a] to-black text-white flex items-center justify-center">

      <div className="w-full max-w-7xl px-6">

        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-2xl tracking-widest bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            MASTRIFY AI ANALYZER
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Make your mix release-ready
          </p>
        </div>

        {/* 🔥 WAVEFORM */}
        <div className="relative mb-16">

  <div className="h-24 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-400 to-orange-400"></div>

  {/* glow */}
  <div className="absolute inset-0 blur-2xl opacity-40 bg-gradient-to-r from-blue-600 via-cyan-400 to-orange-400"></div>

  {/* overlay depth */}
  <div className="absolute inset-0 bg-black/40 rounded-xl"></div>

  {/* subtle scan line */}
  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,white/10,transparent)] animate-pulse"></div>

</div>

        {/* MAIN */}
        <div className="flex items-center justify-center gap-8">

          {/* LEFT PANEL */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-xl shadow-[0_0_60px_rgba(0,255,255,0.06)]">

            <h2 className="text-white/70 mb-6">Mix Analysis</h2>

            <div className="space-y-6 text-sm">

              <div className="text-red-400">
                ▲ Your low end is muddy
                <p className="text-white/40 text-xs mt-1">
                  Cut below 100 Hz
                </p>
              </div>

              <div className="text-yellow-400">
                ▲ Lacks stereo width
                <p className="text-white/40 text-xs mt-1">
                  Add widening
                </p>
              </div>

              <div className="text-green-400">
                ✔ Loudness is OK
              </div>

            </div>

          </div>


          {/* CENTER */}
          <div className="flex flex-col items-center">

            <input
              type="file"
              accept="audio/*"
              onChange={handleUpload}
              className="mb-6 text-sm"
            />

            {/* 🔥 RING */}
            <div className="relative w-56 h-56 flex items-center justify-center">

  {/* outer glow */}
  <div className="absolute w-full h-full rounded-full bg-cyan-400/20 blur-3xl"></div>

    <div className="absolute w-full h-full rounded-full bg-cyan-400/20 blur-3xl"></div>

  <svg className="w-full h-full rotate-[-90deg]">

    <defs>
      <linearGradient id="grad">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2dd4bf" />
      </linearGradient>
    </defs>

    {/* background ring */}
    <circle
      cx="112"
      cy="112"
      r="100"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth="10"
      fill="none"
    />

    {/* progress ring */}
    <circle
      cx="112"
      cy="112"
      r="100"
      stroke="url(#grad)"
      strokeWidth="10"
      fill="none"
      strokeDasharray={Math.PI * 2 * 100}
      strokeDashoffset={
        Math.PI * 2 * 100 -
        (Math.PI * 2 * 100 * (analysis?.score || 75)) / 100
      }
      strokeLinecap="round"
      style={{ transition: "stroke-dashoffset 0.8s ease" }}
    />
  </svg>

  {/* number */}
  <div className="absolute text-5xl font-bold">
    {analysis?.score || 75}%
  </div>

</div>

            <p className="mt-4 text-white/50 text-sm tracking-widest uppercase">
  Ready for release
</p>

          </div>


          {/* RIGHT PANEL */}
          <div className="w-80 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-xl shadow-[0_0_60px_rgba(0,255,255,0.06)]">

            <h2 className="text-white/70 mb-6">Tips</h2>

            <ul className="space-y-3 text-white/60 text-sm">
              <li>• Reduce low frequencies</li>
              <li>• Boost vocals 2–5 kHz</li>
              <li>• Add stereo width</li>
            </ul>

            <div className="pt-6 border-t border-white/10 mt-6">

              <p className="text-white/40 text-xs">Loudness</p>
              <p className="text-lg">
                {analysis?.lufs || "-9.7"} LUFS
              </p>

              <p className="text-white/40 text-xs mt-4">
                Dynamic Range
              </p>
              <p className="text-lg">
                {analysis?.dynamicRange || "8"}
              </p>

            </div>

          </div>

        </div>
      </div>
    </div>
  )
}