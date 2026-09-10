"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import CinematicBackground from "../components/CinematicBackground"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

/** Legacy /app URL — forwards into the cinematic master flow. */
export default function AppLegacyRedirect() {
  const router = useRouter()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("unlocked", "true")
    }
    const id = window.setTimeout(() => router.replace("/master"), 900)
    return () => window.clearTimeout(id)
  }, [router])

  return (
    <motion.div
      className="relative flex min-h-[min(70vh,520px)] flex-col items-center justify-center overflow-hidden px-5 py-16 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,rgba(99,102,241,0.12),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10 flex max-w-md flex-col items-center text-center"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <MasteringEngineVisual activeStep={2} className="mx-auto w-[min(14rem,70vw)] max-w-[16rem]" />
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/60">
          Unlock confirmed
        </p>
        <h1 className="mt-2 text-[1.25rem] font-semibold tracking-[-0.02em] text-white/92">
          Opening the mastering studio
        </h1>
        <p className="mt-2 text-[13px] text-muted">Preparing your release-ready workflow…</p>
      </motion.div>
    </motion.div>
  )
}
