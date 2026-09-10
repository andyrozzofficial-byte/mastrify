"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useMemo } from "react"

const STAGE_PROFILES = [
  { stereo: 0.22, bass: 0.18 },
  { stereo: 0.32, bass: 0.24 },
  { stereo: 0.38, bass: 0.42 },
  { stereo: 1, bass: 0.28 },
  { stereo: 0.62, bass: 0.22 },
] as const

const ORBIT_DURATION_OUTER = 180
const ORBIT_DURATION_INNER = 240
const BREATHE_DURATION = 8

const waveformPaths = [
  "M4 32 C10 18, 16 38, 22 28 S34 16, 40 28",
  "M4 36 C12 28, 20 40, 28 32 S36 24, 40 36",
  "M6 30 C14 22, 22 34, 30 26 S38 18, 42 30",
]

type Props = {
  activeStep: number
  className?: string
}

export default function MasteringEngineVisual({ activeStep, className }: Props) {
  const reduceMotion = useReducedMotion()
  const step = Math.min(Math.max(activeStep, 0), STAGE_PROFILES.length - 1)
  const profile = STAGE_PROFILES[step]

  const paths = useMemo(() => waveformPaths, [])

  return (
    <motion.div
      className={`marketing-engine-visual relative mx-auto aspect-square w-full max-w-full max-lg:max-w-[min(11.5rem,calc(100vw-2.5rem))] lg:w-[min(20rem,88vw)] lg:max-w-[22rem] xl:max-w-[24rem] ${className ?? ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      {/* Static ambient — no animated blur */}
      <div
        className="pointer-events-none absolute -inset-[30%] z-0 opacity-[0.14]"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(79,70,229,0.03) 50%, transparent 72%)",
        }}
      />

      {/* Stereo field */}
      <motion.div
        className="pointer-events-none absolute inset-[6%]"
        animate={{ opacity: 0.22 + profile.stereo * 0.28, scaleX: 0.9 + profile.stereo * 0.1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <ellipse cx="100" cy="100" rx="78" ry="42" stroke="rgba(167,139,250,0.08)" strokeWidth="0.75" />
          <ellipse cx="100" cy="100" rx="62" ry="32" stroke="rgba(167,139,250,0.11)" strokeWidth="0.5" strokeDasharray="3 8" />
        </svg>
      </motion.div>

      {/* Outer ring — slow continuous rotation */}
      <motion.svg
        className="absolute inset-0 h-full w-full will-change-transform"
        viewBox="0 0 200 200"
        fill="none"
        animate={reduceMotion ? {} : { rotate: 360 }}
        transition={{ duration: ORBIT_DURATION_OUTER, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <linearGradient id="specArcA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.06" />
            <stop offset="45%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="specArcB" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" stroke="url(#specArcA)" strokeWidth="0.55" opacity="0.28" />
        <path d="M100 12 A88 88 0 0 1 182 72" stroke="url(#specArcB)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      </motion.svg>

      {/* Inner ring */}
      <motion.svg
        className="absolute inset-[12%] m-auto h-[76%] w-[76%] will-change-transform"
        viewBox="0 0 200 200"
        fill="none"
        animate={reduceMotion ? {} : { rotate: -360 }}
        transition={{ duration: ORBIT_DURATION_INNER, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="70" stroke="rgba(167,139,250,0.12)" strokeWidth="0.65" strokeDasharray="2 12" />
        <path d="M100 30 A70 70 0 0 0 48 148" stroke="rgba(129,140,248,0.2)" strokeWidth="1.1" strokeLinecap="round" />
      </motion.svg>

      {/* Core vessel */}
      <div className="absolute inset-[18%] flex items-center justify-center">
        <div
          className="relative h-full w-full rounded-full p-[2px]"
          style={{
            background:
              "linear-gradient(145deg, rgba(167,139,250,0.22) 0%, rgba(99,102,241,0.14) 42%, rgba(79,70,229,0.18) 100%)",
            boxShadow: "inset 0 0 18px rgba(0,0,0,0.45)",
          }}
        >
          <motion.div
            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#050508]/96"
            animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.012, 1] }}
            transition={{ duration: BREATHE_DURATION, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(196,181,253,0.04)_40deg,transparent_80deg,rgba(129,140,248,0.03)_140deg,transparent_200deg)]"
              animate={reduceMotion ? {} : { rotate: 360 }}
              transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            />

            <svg className="relative z-[1] h-[42%] w-[42%]" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="waveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#f5f3ff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.38" />
                </linearGradient>
              </defs>
              {paths.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  stroke="url(#waveGrad)"
                  strokeWidth={i === 0 ? 2.2 : 1.2}
                  strokeLinecap="round"
                  opacity={i === 0 ? 0.9 : 0.38}
                  animate={
                    reduceMotion
                      ? undefined
                      : { opacity: [0.65 + i * 0.08, 0.85 + i * 0.05, 0.65 + i * 0.08] }
                  }
                  transition={{
                    duration: 5 + i * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.35,
                  }}
                />
              ))}
            </svg>

            <div className="absolute left-1/2 top-1/2 z-[2] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
            <motion.div
              className="absolute left-1/2 top-1/2 z-[1] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-violet-300/16"
              animate={reduceMotion ? { opacity: 0.28 } : { opacity: [0.18, 0.32, 0.18] }}
              transition={{ duration: BREATHE_DURATION, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
