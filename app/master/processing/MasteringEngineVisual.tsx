"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useMemo } from "react"

const STAGE_PROFILES = [
  { halo: 1.14, core: 1, ring: 28, stereo: 0.22, bass: 0.18, tighten: false },
  { halo: 1.06, core: 1.04, ring: 22, stereo: 0.32, bass: 0.24, tighten: false },
  { halo: 0.86, core: 1.08, ring: 16, stereo: 0.38, bass: 0.42, tighten: true },
  { halo: 1.02, core: 1.02, ring: 24, stereo: 1, bass: 0.28, tighten: false },
  { halo: 1.1, core: 0.96, ring: 26, stereo: 0.62, bass: 0.22, tighten: false },
] as const

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  angle: (i / 14) * Math.PI * 2,
  radius: 38 + (i % 5) * 9,
  size: 1.5 + (i % 3) * 0.6,
  delay: i * 0.18,
}))

type Props = {
  activeStep: number
  className?: string
}

export default function MasteringEngineVisual({ activeStep, className }: Props) {
  const reduceMotion = useReducedMotion()
  const step = Math.min(Math.max(activeStep, 0), STAGE_PROFILES.length - 1)
  const profile = STAGE_PROFILES[step]

  const ringDuration = reduceMotion ? 0 : profile.ring

  const waveformPaths = useMemo(
    () => [
      "M4 32 C10 18, 16 38, 22 28 S34 16, 40 28",
      "M4 36 C12 28, 20 40, 28 32 S36 24, 40 36",
      "M6 30 C14 22, 22 34, 30 26 S38 18, 42 30",
    ],
    []
  )

  return (
    <motion.div
      className={`marketing-engine-visual relative mx-auto aspect-square w-full max-w-full max-lg:max-w-[min(11.5rem,calc(100vw-2.5rem))] lg:w-[min(20rem,88vw)] lg:max-w-[22rem] xl:max-w-[24rem] ${className ?? ""}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      {/* Low-end ripples */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`bass-${i}`}
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-indigo-400/14"
          style={{ width: "72%", height: "72%", marginLeft: "-36%", marginTop: "-36%" }}
          animate={
            reduceMotion
              ? { opacity: 0.1 * profile.bass }
              : {
                  scale: [0.92 + i * 0.04, 1.02 + profile.bass * 0.08, 0.92 + i * 0.04],
                  opacity: [0.06, 0.16 * profile.bass, 0.06],
                }
          }
          transition={{ duration: 3.6 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}

      {/* Stereo field arcs */}
      <motion.div
        className="pointer-events-none absolute inset-[6%]"
        animate={{ opacity: 0.28 + profile.stereo * 0.35, scaleX: 0.88 + profile.stereo * 0.14 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <ellipse cx="100" cy="100" rx="78" ry="42" stroke="rgba(167,139,250,0.10)" strokeWidth="0.75" />
          <ellipse cx="100" cy="100" rx="62" ry="32" stroke="rgba(167,139,250,0.14)" strokeWidth="0.5" strokeDasharray="3 8" />
        </svg>
      </motion.div>

      {/* Spectral arcs — outer */}
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        fill="none"
        animate={reduceMotion ? {} : { rotate: 360 }}
        transition={{ duration: ringDuration, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <linearGradient id="specArcA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.08" />
            <stop offset="45%" stopColor="#818cf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="specArcB" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" stroke="url(#specArcA)" strokeWidth="0.6" opacity="0.3" />
        <path d="M100 12 A88 88 0 0 1 182 72" stroke="url(#specArcB)" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
        <path d="M182 128 A88 88 0 0 1 100 188" stroke="url(#specArcA)" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
      </motion.svg>

      {/* Counter-rotating inner ring */}
      <motion.svg
        className="absolute inset-[12%] m-auto h-[76%] w-[76%]"
        viewBox="0 0 200 200"
        fill="none"
        animate={reduceMotion ? {} : { rotate: -360 }}
        transition={{ duration: ringDuration * 0.65, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="70" stroke="rgba(167,139,250,0.16)" strokeWidth="0.75" strokeDasharray="2 12" />
        <path d="M100 30 A70 70 0 0 0 48 148" stroke="rgba(129,140,248,0.28)" strokeWidth="1.25" strokeLinecap="round" />
      </motion.svg>

      {/* Particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-violet-200/70"
          style={{
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
          animate={
            reduceMotion
              ? { opacity: 0.25 }
              : {
                  x: Math.cos(p.angle + step * 0.15) * p.radius * 1.8,
                  y: Math.sin(p.angle + step * 0.15) * p.radius * 1.8,
                  opacity: [0.12, 0.45, 0.12],
                  scale: [0.85, 1.1, 0.85],
                }
          }
          transition={{
            duration: 3.2 + (p.id % 4) * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      {/* Core vessel */}
      <div className="absolute inset-[18%] flex items-center justify-center">
        <motion.div
          className="relative h-full w-full rounded-full p-[2px]"
          style={{
            background:
              "linear-gradient(145deg, rgba(167,139,250,0.32) 0%, rgba(99,102,241,0.22) 42%, rgba(79,70,229,0.28) 100%)",
          }}
          animate={
            reduceMotion
              ? {}
              : {
                  boxShadow: profile.tighten
                    ? [
                        "inset 0 0 24px rgba(0,0,0,0.5)",
                        "inset 0 0 28px rgba(0,0,0,0.52)",
                        "inset 0 0 24px rgba(0,0,0,0.5)",
                      ]
                    : [
                        "inset 0 0 20px rgba(0,0,0,0.45)",
                        "inset 0 0 24px rgba(0,0,0,0.48)",
                        "inset 0 0 20px rgba(0,0,0,0.45)",
                      ],
                }
          }
          transition={{ duration: profile.tighten ? 1.6 : 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#050508]/94"
            animate={{ scale: reduceMotion ? 1 : [1, profile.core, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Harmonic shimmer */}
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(196,181,253,0.06)_40deg,transparent_80deg,rgba(129,140,248,0.04)_140deg,transparent_200deg)]"
              animate={reduceMotion ? {} : { rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            />

            {/* Waveform energy */}
            <svg className="relative z-[1] h-[42%] w-[42%]" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="waveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#f5f3ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.45" />
                </linearGradient>
              </defs>
              {waveformPaths.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  stroke="url(#waveGrad)"
                  strokeWidth={i === 0 ? 2.2 : 1.2}
                  strokeLinecap="round"
                  opacity={i === 0 ? 1 : 0.45}
                  animate={
                    reduceMotion
                      ? { opacity: i === 0 ? 0.85 : 0.35 }
                      : { opacity: [0.55 + i * 0.1, 1, 0.55 + i * 0.1] }
                  }
                  transition={{
                    duration: 2.2 + i * 0.25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </svg>

            {/* Transient pulse core */}
            <motion.div
              className="absolute left-1/2 top-1/2 z-[2] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              animate={
                reduceMotion
                  ? { scale: 1 }
                  : { scale: [1, 1.25 * profile.core, 1], opacity: [0.85, 1, 0.85] }
              }
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 z-[1] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-violet-300/22"
              animate={
                reduceMotion
                  ? { opacity: 0.35 }
                  : { scale: [1, 1.18, 1], opacity: [0.2, 0.42, 0.2] }
              }
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Scan line — analyzing feel */}
      <motion.div
        className="pointer-events-none absolute inset-[18%] overflow-hidden rounded-full"
        animate={{ opacity: step === 0 ? 0.28 : 0.06 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="h-[2px] w-full bg-gradient-to-r from-transparent via-violet-200/30 to-transparent blur-[1px]"
          animate={reduceMotion ? { top: "50%" } : { top: ["8%", "92%", "8%"] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: 0, right: 0 }}
        />
      </motion.div>
    </motion.div>
  )
}
