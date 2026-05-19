"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"

/** Shared engine step cycle for hero orbs (5 stages). */
export function useEngineStepRotation(intervalMs = 4000) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setStep((s) => (s + 1) % 5), intervalMs)
    return () => clearInterval(id)
  }, [reduce, intervalMs])

  return step
}
