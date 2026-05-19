"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import CinematicBackground from "../CinematicBackground"
import MarketingPageAmbient from "../MarketingPageAmbient"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  children: ReactNode
  showBottomFade?: boolean
}

/** Shared page chrome for /analyze upload and /master upload. */
export default function ProductFlowPageShell({ children, showBottomFade = false }: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="product-flow-page relative min-h-screen overflow-x-clip text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" marketingLite />
      <MarketingPageAmbient />

      {showBottomFade ? (
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-violet-950/[0.08] to-transparent"
          aria-hidden
          animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <div className="product-flow-page-inner relative z-10 mx-auto w-full max-w-[1080px] px-5 pb-4 pt-6 md:px-10 md:pb-8 md:pt-8">
        {children}
      </div>
    </motion.div>
  )
}
