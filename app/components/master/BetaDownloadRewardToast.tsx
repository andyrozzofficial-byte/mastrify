"use client"

import { useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  visible: boolean
  onDismiss: () => void
}

export default function BetaDownloadRewardToast({ visible, onDismiss }: Props) {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!visible) return
    const t = window.setTimeout(onDismiss, 3000)
    return () => window.clearTimeout(t)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-sm sm:inset-x-auto sm:right-6 sm:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto rounded-xl border border-violet-400/28 bg-[#0c0c14]/95 px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
        <p className="text-[14px] font-semibold text-white">Master downloaded</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/62">+1 point earned</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-violet-200/75">Thanks for helping shape Mastrify</p>
      </div>
    </motion.div>
  )
}
