"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { DragEvent, ReactNode } from "react"
import HeroWaveBackdrop from "../HeroWaveBackdrop"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  children: ReactNode
  dragging: boolean
  loaded?: boolean
  onDragOver: (e: DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent) => void
}

/** Shared upload card frame — identical chrome on Analyze + Master. */
export default function CinematicUploadCardShell({
  children,
  dragging,
  loaded = false,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="cinematic-upload-card-root fluid-surface relative"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
    >
      <div
        className="cinematic-upload-card-glow pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-500/15 blur-sm"
        aria-hidden
      />

      <motion.div
        layout
        className={`cinematic-upload-card-panel fluid-surface relative overflow-hidden transition-[border-color,box-shadow] duration-300 ${
          loaded
            ? "border-violet-400/22 shadow-[0_0_28px_rgba(99,102,241,0.1),0_28px_64px_rgba(0,0,0,0.48)]"
            : dragging
              ? "border-violet-400/30"
              : "border-white/[0.1] hover:border-white/[0.14]"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
          animate={{ height: loaded ? "48%" : "38%", opacity: loaded ? 0.2 : 0.1 }}
          transition={{ duration: 0.55, ease: EASE }}
          aria-hidden
        >
          <HeroWaveBackdrop efficient heightClass="h-full" className="opacity-100" />
        </motion.div>

        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-600/[0.08] blur-2xl"
          aria-hidden
        />

        <div className="relative flex min-w-0 flex-col p-3.5 sm:p-6">{children}</div>
      </motion.div>
    </motion.div>
  )
}
