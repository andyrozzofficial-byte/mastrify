"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { motion } from "framer-motion"
import CinematicBackground from "../../components/CinematicBackground"
import { appendHistory } from "../../../lib/history"
import { useMasterSession } from "../MasterSessionProvider"

const API = "https://mastrify-backend-production.up.railway.app"

const STEPS = [
  "Initializing mastering engine",
  "Balancing low-end",
  "Enhancing stereo image",
  "Optimizing loudness",
  "Controlling dynamics",
  "Finalizing master",
]

export default function MasterProcessingPage() {
  const router = useRouter()
  const { file, setMasteredUrl, setMasteredPreviewMp3Url } = useMasterSession()
  const [line, setLine] = useState(STEPS[0])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!file) {
      router.replace("/master")
      return
    }

    let cancelled = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const ac = new AbortController()

    const run = async () => {
      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return
        setLine(STEPS[i] + "…")
        await sleep(i === 0 ? 500 : 800)
      }

      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await axios.post(`${API}/master`, formData, { signal: ac.signal })
        if (cancelled) return

        const mastered =
          res.data.afterUrl || res.data.fullUrl || (res.data.after ? `${API}${res.data.after}` : "")
        const previewMp3 =
          res.data.previewAfterMp3Url ||
          (res.data.previewAfterMp3 ? `${API}${res.data.previewAfterMp3}` : "")

        setMasteredUrl(mastered)
        setMasteredPreviewMp3Url(previewMp3)

        appendHistory({
          kind: "master",
          name: file.name,
          masteredUrl: mastered || undefined,
        })

        await sleep(500)
        if (!cancelled) router.replace("/master/result")
      } catch (e: unknown) {
        const aborted =
          (typeof axios.isCancel === "function" && axios.isCancel(e)) ||
          (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "ERR_CANCELED")
        if (aborted) return
        alert("Mastering failed")
        if (!cancelled) router.replace("/master/settings")
      }
    }

    run()
    const pulse = setInterval(() => setTick((t) => t + 1), 120)
    return () => {
      cancelled = true
      clearInterval(pulse)
      ac.abort()
    }
  }, [file, router, setMasteredUrl, setMasteredPreviewMp3Url])

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6 text-white md:min-h-[calc(100vh-4rem)]">
      <CinematicBackground intensity="strong" />
      <motion.div
        className="relative flex h-40 w-40 items-center justify-center rounded-full"
        animate={{ rotate: tick * 3 }}
        transition={{ duration: 0.2, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/40 via-cyan-400/20 to-blue-500/30 blur-2xl" />
        <div className="absolute inset-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/20 shadow-[0_0_60px_rgba(139,92,246,0.45)]">
          <svg className="h-10 w-10 text-white/90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      </motion.div>

      <motion.p
        key={line}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mt-10 max-w-md text-center font-mono text-sm text-white/70"
      >
        {line}
      </motion.p>

      <div className="relative mt-8 flex gap-1.5">
        {STEPS.map((_, i) => (
          <motion.span
            key={i}
            className="h-1 w-8 rounded-full bg-white/10"
            animate={{
              backgroundColor: i <= (tick % STEPS.length) ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
