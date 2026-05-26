"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { DragEvent, ReactNode } from "react"
import HeroWaveBackdrop from "../HeroWaveBackdrop"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  children: ReactNode
  dragging: boolean
  loaded?: boolean
  /** Stronger border/glow for primary workflow upload (e.g. master hero). */
  emphasis?: "default" | "primary"
  onDragOver: (e: DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent) => void
}

/** Shared upload card frame — identical chrome on Analyze + Master. */
export default function CinematicUploadCardShell({
  children,
  dragging,
  loaded = false,
  emphasis = "default",
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  const reduce = useReducedMotion()
  const isPrimary = emphasis === "primary"

  return (
    <motion.div
      className={`cinematic-upload-card-root fluid-surface relative ${isPrimary ? "cinematic-upload-card-root--primary" : ""}`}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
    >
      <div
        className={`cinematic-upload-card-glow pointer-events-none absolute -inset-px rounded-[1.35rem] blur-sm ${
          isPrimary
            ? "bg-gradient-to-br from-violet-500/28 via-violet-600/10 to-cyan-500/18 opacity-70"
            : "bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-500/15"
        }`}
        aria-hidden
      />

      <motion.div
        layout
        className={`cinematic-upload-card-panel fluid-surface relative overflow-hidden transition-[border-color,box-shadow] duration-300 ${
          isPrimary
            ? loaded
              ? "border-violet-400/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_32px_rgba(99,102,241,0.14),0_32px_72px_rgba(0,0,0,0.55)]"
              : dragging
                ? "border-violet-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_28px_rgba(99,102,241,0.12),0_28px_68px_rgba(0,0,0,0.5)]"
                : "border-violet-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_20px_rgba(99,102,241,0.08),0_28px_68px_rgba(0,0,0,0.52)] hover:border-violet-400/26"
            : loaded
              ? "border-violet-400/22 shadow-[0_0_28px_rgba(99,102,241,0.1),0_28px_64px_rgba(0,0,0,0.48)]"
              : dragging
                ? "border-violet-400/30"
                : "border-white/[0.1] hover:border-white/[0.14]"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] overflow-hidden opacity-10"
          aria-hidden
        >
          <HeroWaveBackdrop efficient heightClass="h-full" className="opacity-100" />
        </div>

        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-600/[0.08] blur-2xl"
          aria-hidden
        />

        <div className="relative flex min-w-0 flex-col p-3.5 sm:p-6">{children}</div>
      </motion.div>
    </motion.div>
  )
}
