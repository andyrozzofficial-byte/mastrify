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
  /** Marketing heroes: fewer layers, no animated blurs/shadows */
  efficient?: boolean
}

export default function MasteringEngineVisual({ activeStep, className, efficient = false }: Props) {
  const reduceMotion = useReducedMotion()
  const step = Math.min(Math.max(activeStep, 0), STAGE_PROFILES.length - 1)
  const profile = STAGE_PROFILES[step]

  const ringDuration = reduceMotion ? 0 : profile.ring
  const haloScale = profile.halo
  const particles = efficient ? PARTICLES.slice(0, 6) : PARTICLES
  const bassRipples = efficient ? ([0, 1] as const) : ([0, 1, 2] as const)

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
      className={`relative mx-auto aspect-square w-full max-w-full max-lg:max-w-[min(11.5rem,calc(100vw-2.5rem))] lg:w-[min(20rem,88vw)] lg:max-w-[22rem] xl:max-w-[24rem] ${className ?? ""}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      {/* Depth layers — parallax glow */}
      {efficient ? (
        <div
          className="engine-halo-breathe pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.24)_0%,rgba(79,70,229,0.08)_45%,transparent_65%)] blur-2xl"
          style={reduceMotion ? { opacity: 0.52 } : undefined}
        />
      ) : (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.28)_0%,rgba(79,70,229,0.08)_45%,transparent_65%)] blur-3xl max-lg:scale-[0.98] lg:inset-[-5%] lg:scale-100 xl:inset-[-16%] 2xl:inset-[-22%]"
            animate={
              reduceMotion
                ? { opacity: 0.5 }
                : { opacity: [0.44, 0.66, 0.44], scale: [haloScale * 0.98, haloScale * 1.05, haloScale * 0.98] }
            }
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_40%,rgba(34,211,238,0.12),transparent_55%)] blur-2xl lg:inset-[-4%] xl:inset-[-12%]"
            animate={reduceMotion ? {} : { opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Low-end ripples */}
      {bassRipples.map((i) => (
        <motion.div
          key={`bass-${i}`}
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-indigo-400/20"
          style={{ width: "72%", height: "72%", marginLeft: "-36%", marginTop: "-36%" }}
          animate={
            reduceMotion
              ? { opacity: 0.12 * profile.bass }
              : efficient
                ? { opacity: [0.08, 0.18 * profile.bass, 0.08] }
                : {
                    scale: [0.92 + i * 0.04, 1.02 + profile.bass * 0.08, 0.92 + i * 0.04],
                    opacity: [0.08, 0.22 * profile.bass, 0.08],
                  }
          }
          transition={{ duration: 3.6 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}

      {/* Stereo field arcs */}
      <motion.div
        className="pointer-events-none absolute inset-[6%]"
        animate={{ opacity: 0.35 + profile.stereo * 0.45, scaleX: 0.88 + profile.stereo * 0.14 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <ellipse cx="100" cy="100" rx="78" ry="42" stroke="rgba(125,211,252,0.12)" strokeWidth="0.75" />
          <ellipse cx="100" cy="100" rx="62" ry="32" stroke="rgba(167,139,250,0.18)" strokeWidth="0.5" strokeDasharray="3 8" />
        </svg>
      </motion.div>

      {/* Spectral arcs — outer */}
      <motion.svg
        className={`absolute inset-0 h-full w-full ${efficient && !reduceMotion ? "engine-ring-spin-cw" : ""}`}
        viewBox="0 0 200 200"
        fill="none"
        animate={efficient || reduceMotion ? {} : { rotate: 360 }}
        transition={{ duration: ringDuration, repeat: Infinity, ease: "linear" }}
        style={
          efficient && !reduceMotion && ringDuration
            ? { animationDuration: `${ringDuration}s` }
            : undefined
        }
      >
        <defs>
          <linearGradient id="specArcA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.1" />
            <stop offset="45%" stopColor="#818cf8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="specArcB" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="88" stroke="url(#specArcA)" strokeWidth="0.6" opacity="0.35" />
        <path d="M100 12 A88 88 0 0 1 182 72" stroke="url(#specArcB)" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
        <path d="M182 128 A88 88 0 0 1 100 188" stroke="url(#specArcA)" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
      </motion.svg>

      {/* Counter-rotating inner ring */}
      <motion.svg
        className={`absolute inset-[12%] m-auto h-[76%] w-[76%] ${efficient && !reduceMotion ? "engine-ring-spin-ccw" : ""}`}
        viewBox="0 0 200 200"
        fill="none"
        animate={efficient || reduceMotion ? {} : { rotate: -360 }}
        transition={{ duration: ringDuration * 0.65, repeat: Infinity, ease: "linear" }}
        style={
          efficient && !reduceMotion && ringDuration
            ? { animationDuration: `${ringDuration * 0.65}s` }
            : undefined
        }
      >
        <circle cx="100" cy="100" r="70" stroke="rgba(167,139,250,0.2)" strokeWidth="0.75" strokeDasharray="2 12" />
        <path d="M100 30 A70 70 0 0 0 48 148" stroke="rgba(56,189,248,0.35)" strokeWidth="1.25" strokeLinecap="round" />
      </motion.svg>

      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-violet-200/80 ${
            efficient ? "" : "shadow-[0_0_8px_rgba(167,139,250,0.5)]"
          }`}
          style={{
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            ...(efficient
              ? {
                  transform: `translate(${Math.cos(p.angle + step * 0.15) * p.radius * 1.8}px, ${Math.sin(p.angle + step * 0.15) * p.radius * 1.8}px)`,
                }
              : {}),
          }}
          animate={
            reduceMotion
              ? { opacity: 0.3 }
              : efficient
                ? { opacity: [0.18, 0.42, 0.18] }
                : {
                    x: Math.cos(p.angle + step * 0.15) * p.radius * 1.8,
                    y: Math.sin(p.angle + step * 0.15) * p.radius * 1.8,
                    opacity: [0.15, 0.55, 0.15],
                    scale: [0.8, 1.2, 0.8],
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
              "linear-gradient(145deg, rgba(167,139,250,0.55) 0%, rgba(99,102,241,0.35) 42%, rgba(56,189,248,0.45) 100%)",
            ...(efficient
              ? {
                  boxShadow: profile.tighten
                    ? "0 0 44px rgba(99,102,241,0.16), inset 0 0 28px rgba(0,0,0,0.5)"
                    : "0 0 52px rgba(139,92,246,0.14), inset 0 0 26px rgba(0,0,0,0.48)",
                }
              : {}),
          }}
          animate={
            reduceMotion || efficient
              ? {}
              : {
                  boxShadow: profile.tighten
                    ? [
                        "0 0 40px rgba(99,102,241,0.15), inset 0 0 30px rgba(0,0,0,0.5)",
                        "0 0 56px rgba(79,70,229,0.22), inset 0 0 36px rgba(0,0,0,0.55)",
                        "0 0 40px rgba(99,102,241,0.15), inset 0 0 30px rgba(0,0,0,0.5)",
                      ]
                    : [
                        "0 0 48px rgba(139,92,246,0.12), inset 0 0 24px rgba(0,0,0,0.45)",
                        "0 0 72px rgba(99,102,241,0.2), inset 0 0 32px rgba(0,0,0,0.5)",
                        "0 0 48px rgba(139,92,246,0.12), inset 0 0 24px rgba(0,0,0,0.45)",
                      ],
                }
          }
          transition={{ duration: profile.tighten ? 1.6 : 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full ${
              efficient ? "bg-[#050508]/96" : "bg-[#050508]/92 backdrop-blur-xl"
            }`}
            animate={{ scale: reduceMotion ? 1 : [1, profile.core, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Harmonic shimmer */}
            {efficient ? (
              <div
                className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(196,181,253,0.08)_40deg,transparent_80deg,rgba(125,211,252,0.06)_140deg,transparent_200deg)]"
                aria-hidden
              />
            ) : (
              <motion.div
                className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(196,181,253,0.08)_40deg,transparent_80deg,rgba(125,211,252,0.06)_140deg,transparent_200deg)]"
                animate={reduceMotion ? {} : { rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Waveform energy */}
            <svg className="relative z-[1] h-[42%] w-[42%]" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="waveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#f5f3ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.55" />
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
              className="absolute left-1/2 top-1/2 z-[2] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.55),0_0_40px_rgba(167,139,250,0.45)]"
              animate={
                reduceMotion
                  ? { scale: 1 }
                  : { scale: [1, 1.35 * profile.core, 1], opacity: [0.85, 1, 0.85] }
              }
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 z-[1] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-violet-300/30"
              animate={
                reduceMotion
                  ? { opacity: 0.4 }
                  : { scale: [1, 1.25, 1], opacity: [0.25, 0.55, 0.25] }
              }
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Scan line — analyzing feel */}
      <motion.div
        className="pointer-events-none absolute inset-[18%] overflow-hidden rounded-full"
        animate={{ opacity: step === 0 ? 0.35 : 0.08 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className={`h-[2px] w-full bg-gradient-to-r from-transparent via-violet-200/40 to-transparent ${efficient ? "" : "blur-[1px]"}`}
          animate={reduceMotion ? { top: "50%" } : { top: ["8%", "92%", "8%"] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: 0, right: 0 }}
        />
      </motion.div>
    </motion.div>
  )
}
