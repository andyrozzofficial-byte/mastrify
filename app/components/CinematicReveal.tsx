"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { revealTransition } from "../../lib/cinematicMotion"

type Props = {
  children: ReactNode
  className?: string
  delay?: number
}

export default function CinematicReveal({ children, className = "", delay = 0 }: Props) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-56px" }}
      transition={{ ...revealTransition, delay }}
      style={reduce ? undefined : { willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  )
}
