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
  /**
   * "hero" lifts contrast and motion for the marketing hero globe.
   * "standard" renders exactly as the processing screens always have.
   */
  intensity?: "standard" | "hero"
}

export default function MasteringEngineVisual({ activeStep, className, intensity = "standard" }: Props) {
  const reduceMotion = useReducedMotion()
  const hero = intensity === "hero"
  const step = Math.min(Math.max(activeStep, 0), STAGE_PROFILES.length - 1)
  const profile = STAGE_PROFILES[step]

  const ringDuration = reduceMotion ? 0 : hero ? profile.ring * 0.78 : profile.ring

  const waveformPaths = useMemo(
    () => [
      "M4 32 C10 18, 16 38, 22 28 S34 16, 40 28",
      "M4 36 C12 28, 20 40, 28 32 S36 24, 40 36",
      "M6 30 C14 22, 22 34, 30 26 S38 18, 42 30",
    ],
    []
  )

  const stereoArcs = (
    <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
      <ellipse
        cx="100"
        cy="100"
        rx="78"
        ry="42"
        stroke={hero ? "rgba(167,139,250,0.20)" : "rgba(167,139,250,0.10)"}
        strokeWidth={hero ? 1 : 0.75}
      />
      <ellipse
        cx="100"
        cy="100"
        rx="62"
        ry="32"
        stroke={hero ? "rgba(167,139,250,0.28)" : "rgba(167,139,250,0.14)"}
        strokeWidth={hero ? 0.8 : 0.5}
        strokeDasharray="3 8"
      />
    </svg>
  )

  const particles = PARTICLES.map((p) => (
    <motion.div
      key={p.id}
      className={`pointer-events-none absolute left-1/2 top-1/2 rounded-full ${
        hero ? "bg-violet-200/80" : "bg-violet-200/70"
      }`}
      style={{
        width: p.size,
        height: p.size,
        marginLeft: -p.size / 2,
        marginTop: -p.size / 2,
      }}
      animate={
        reduceMotion
          ? { opacity: hero ? 0.4 : 0.25 }
          : {
              x: Math.cos(p.angle + step * 0.15) * p.radius * 1.8,
              y: Math.sin(p.angle + step * 0.15) * p.radius * 1.8,
              opacity: hero ? [0.18, 0.72, 0.18] : [0.12, 0.45, 0.12],
              scale: hero ? [0.8, 1.25, 0.8] : [0.85, 1.1, 0.85],
            }
      }
      transition={{
        duration: (hero ? 2.6 : 3.2) + (p.id % 4) * 0.3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: p.delay,
      }}
    />
  ))

  return (
    <motion.div
      className={`marketing-engine-visual relative mx-auto aspect-square w-full max-w-full max-lg:max-w-[min(11.5rem,calc(100vw-2.5rem))] lg:w-[min(20rem,88vw)] lg:max-w-[22rem] xl:max-w-[24rem] ${className ?? ""}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      {/* Ambient lift — separates the globe from the page background */}
      {hero ? (
        <motion.div
          className="pointer-events-none absolute inset-[-8%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.11) 0%, rgba(99,102,241,0.055) 44%, transparent 70%)",
          }}
          animate={reduceMotion ? { opacity: 0.6 } : { opacity: [0.45, 0.78, 0.45], scale: [0.98, 1.035, 0.98] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      {/* Low-end ripples */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`bass-${i}`}
          className={`pointer-events-none absolute left-1/2 top-1/2 rounded-full border ${
            hero ? "border-indigo-400/25" : "border-indigo-400/14"
          }`}
          style={{ width: "72%", height: "72%", marginLeft: "-36%", marginTop: "-36%" }}
          animate={
            reduceMotion
              ? { opacity: (hero ? 0.18 : 0.1) * profile.bass }
              : {
                  scale: hero
                    ? [0.9 + i * 0.045, 1.06 + profile.bass * 0.12, 0.9 + i * 0.045]
                    : [0.92 + i * 0.04, 1.02 + profile.bass * 0.08, 0.92 + i * 0.04],
                  opacity: hero
                    ? [0.12, 0.18 + profile.bass * 0.5, 0.12]
                    : [0.06, 0.16 * profile.bass, 0.06],
                }
          }
          transition={{
            duration: (hero ? 3 : 3.6) + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        />
      ))}

      {/* Stereo field arcs */}
      <motion.div
        className="pointer-events-none absolute inset-[6%]"
        animate={{
          opacity: hero
            ? Math.min(1, (0.28 + profile.stereo * 0.35) * 1.7)
            : 0.28 + profile.stereo * 0.35,
          scaleX: 0.88 + profile.stereo * 0.14,
        }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {hero ? (
          <motion.div
            className="h-full w-full"
            animate={reduceMotion ? {} : { rotate: [-2.5, 2.5, -2.5] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          >
            {stereoArcs}
          </motion.div>
        ) : (
          stereoArcs
        )}
      </motion.div>

      {/* Spectral arcs — outer */}
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        fill="none"
        animate={reduceMotion ? {} : hero ? { rotate: 360, opacity: [0.82, 1, 0.82] } : { rotate: 360 }}
        transition={
          hero
            ? {
                rotate: { duration: ringDuration, repeat: Infinity, ease: "linear" },
                opacity: { duration: 7, repeat: Infinity, ease: "easeInOut" },
              }
            : { duration: ringDuration, repeat: Infinity, ease: "linear" }
        }
      >
        <defs>
          <linearGradient id="specArcA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={hero ? "0.16" : "0.08"} />
            <stop offset="45%" stopColor="#818cf8" stopOpacity={hero ? "0.85" : "0.5"} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={hero ? "0.2" : "0.1"} />
          </linearGradient>
          <linearGradient id="specArcB" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity={hero ? "0.72" : "0.4"} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={hero ? "0.12" : "0.06"} />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="88"
          stroke="url(#specArcA)"
          strokeWidth={hero ? 0.9 : 0.6}
          opacity={hero ? 0.55 : 0.3}
        />
        <path
          d="M100 12 A88 88 0 0 1 182 72"
          stroke="url(#specArcB)"
          strokeWidth={hero ? 2.6 : 2.2}
          strokeLinecap="round"
          opacity={hero ? 0.9 : 0.65}
        />
        <path
          d="M182 128 A88 88 0 0 1 100 188"
          stroke="url(#specArcA)"
          strokeWidth={hero ? 1.8 : 1.4}
          strokeLinecap="round"
          opacity={hero ? 0.6 : 0.35}
        />
      </motion.svg>

      {/* Counter-rotating inner ring */}
      <motion.svg
        className="absolute inset-[12%] m-auto h-[76%] w-[76%]"
        viewBox="0 0 200 200"
        fill="none"
        animate={reduceMotion ? {} : { rotate: -360 }}
        transition={{ duration: ringDuration * 0.65, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="100"
          cy="100"
          r="70"
          stroke={hero ? "rgba(167,139,250,0.30)" : "rgba(167,139,250,0.16)"}
          strokeWidth={hero ? 1 : 0.75}
          strokeDasharray="2 12"
        />
        <path
          d="M100 30 A70 70 0 0 0 48 148"
          stroke={hero ? "rgba(129,140,248,0.50)" : "rgba(129,140,248,0.28)"}
          strokeWidth={hero ? 1.6 : 1.25}
          strokeLinecap="round"
        />
      </motion.svg>

      {/* Particles */}
      {hero ? (
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={reduceMotion ? {} : { rotate: 360 }}
          transition={{ duration: 54, repeat: Infinity, ease: "linear" }}
        >
          {particles}
        </motion.div>
      ) : (
        particles
      )}

      {/* Core vessel */}
      <div className="absolute inset-[18%] flex items-center justify-center">
        <motion.div
          className="relative h-full w-full rounded-full p-[2px]"
          style={{
            background: hero
              ? "linear-gradient(145deg, rgba(167,139,250,0.50) 0%, rgba(99,102,241,0.36) 42%, rgba(79,70,229,0.44) 100%)"
              : "linear-gradient(145deg, rgba(167,139,250,0.32) 0%, rgba(99,102,241,0.22) 42%, rgba(79,70,229,0.28) 100%)",
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
          {/* Travelling rim light — only the 2px ring is visible behind the core */}
          {hero ? (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(221,214,254,0.5) 55deg, transparent 130deg, transparent 360deg)",
              }}
              animate={reduceMotion ? {} : { rotate: 360 }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            />
          ) : null}

          <motion.div
            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#050508]/94"
            animate={{
              scale: reduceMotion
                ? 1
                : hero
                  ? [1, 1 + (profile.core - 1) * 1.6 + 0.014, 1]
                  : [1, profile.core, 1],
            }}
            transition={{ duration: hero ? 2.1 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Harmonic shimmer */}
            <motion.div
              className={
                hero
                  ? "pointer-events-none absolute inset-0 bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(196,181,253,0.13)_40deg,transparent_80deg,rgba(129,140,248,0.09)_140deg,transparent_200deg)]"
                  : "pointer-events-none absolute inset-0 bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(196,181,253,0.06)_40deg,transparent_80deg,rgba(129,140,248,0.04)_140deg,transparent_200deg)]"
              }
              animate={reduceMotion ? {} : { rotate: 360 }}
              transition={{ duration: hero ? 16 : 24, repeat: Infinity, ease: "linear" }}
            />

            {/* Waveform energy */}
            <motion.svg
              className="relative z-[1] h-[42%] w-[42%]"
              viewBox="0 0 48 48"
              fill="none"
              animate={reduceMotion || !hero ? {} : { scaleY: [1, 1.09, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <defs>
                <linearGradient id="waveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity={hero ? "0.6" : "0.35"} />
                  <stop offset="50%" stopColor="#f5f3ff" stopOpacity={hero ? "1" : "0.9"} />
                  <stop offset="100%" stopColor="#a5b4fc" stopOpacity={hero ? "0.7" : "0.45"} />
                </linearGradient>
              </defs>
              {waveformPaths.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  stroke="url(#waveGrad)"
                  strokeWidth={hero ? (i === 0 ? 2.6 : 1.5) : i === 0 ? 2.2 : 1.2}
                  strokeLinecap="round"
                  opacity={i === 0 ? 1 : 0.45}
                  animate={
                    reduceMotion
                      ? { opacity: i === 0 ? 0.85 : 0.35 }
                      : hero
                        ? { opacity: [0.68 + i * 0.08, 1, 0.68 + i * 0.08] }
                        : { opacity: [0.55 + i * 0.1, 1, 0.55 + i * 0.1] }
                  }
                  transition={{
                    duration: (hero ? 1.9 : 2.2) + i * 0.25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.svg>

            {/* Transient pulse core */}
            <motion.div
              className="absolute left-1/2 top-1/2 z-[2] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              animate={
                reduceMotion
                  ? { scale: 1 }
                  : hero
                    ? { scale: [1, 1.42 * profile.core, 1], opacity: [0.88, 1, 0.88] }
                    : { scale: [1, 1.25 * profile.core, 1], opacity: [0.85, 1, 0.85] }
              }
              transition={{ duration: hero ? 1.5 : 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className={`absolute left-1/2 top-1/2 z-[1] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ${
                hero ? "ring-violet-300/40" : "ring-violet-300/22"
              }`}
              animate={
                reduceMotion
                  ? { opacity: 0.35 }
                  : hero
                    ? { scale: [1, 1.3, 1], opacity: [0.28, 0.62, 0.28] }
                    : { scale: [1, 1.18, 1], opacity: [0.2, 0.42, 0.2] }
              }
              transition={{ duration: hero ? 2.3 : 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Scan line — analyzing feel */}
      <motion.div
        className="pointer-events-none absolute inset-[18%] overflow-hidden rounded-full"
        animate={{ opacity: hero ? (step === 0 ? 0.5 : 0.14) : step === 0 ? 0.28 : 0.06 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className={`h-[2px] w-full bg-gradient-to-r from-transparent blur-[1px] ${
            hero ? "via-violet-200/55" : "via-violet-200/30"
          } to-transparent`}
          animate={reduceMotion ? { top: "50%" } : { top: ["8%", "92%", "8%"] }}
          transition={{ duration: hero ? 3.8 : 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: 0, right: 0 }}
        />
      </motion.div>
    </motion.div>
  )
}
