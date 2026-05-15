"use client"

import { motion, useReducedMotion } from "framer-motion"

type Props = {
  className?: string
}

export default function CinematicDivider({ className = "" }: Props) {
  const reduce = useReducedMotion()
  return (
    <div className={`relative h-px w-full ${className}`} aria-hidden>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
        animate={reduce ? undefined : { opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[2px] w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-violet-400/50 to-transparent blur-[2px]"
        animate={reduce ? undefined : { opacity: [0.2, 0.55, 0.2], scaleX: [0.85, 1.1, 0.85] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}
