"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import CinematicBackground from "../CinematicBackground"
import MarketingPageAmbient from "../MarketingPageAmbient"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  children: ReactNode
  showBottomFade?: boolean
  /** Extra wrapper inside page (e.g. analyze results max-width) */
  innerClassName?: string
}

export default function CinematicPageShell({
  children,
  showBottomFade = false,
  innerClassName = "",
}: Props) {
  return (
    <motion.div
      className="marketing-page-root relative min-h-screen overflow-x-clip text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" marketingLite />
      <MarketingPageAmbient />

      {showBottomFade ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-violet-950/[0.08] to-transparent"
          aria-hidden
        />
      ) : null}

      <div className={`relative z-10 ${innerClassName}`.trim()}>{children}</div>
    </motion.div>
  )
}
