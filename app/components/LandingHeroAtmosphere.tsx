"use client"

import { motion, useReducedMotion } from "framer-motion"

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${8 + ((i * 13.7) % 84)}%`,
  top: `${10 + ((i * 17.3) % 80)}%`,
  size: 1 + (i % 3) * 0.45,
  duration: 5.5 + (i % 4) * 0.8,
  delay: i * 0.35,
}))

type Props = {
  className?: string
  /** Tighter glow bounds for mobile hero columns */
  compact?: boolean
  /** Slightly stronger radial depth on narrow viewports */
  mobileGlowBoost?: boolean
  /** When false, atmosphere layers hold a static frame (no repeat loops). */
  motionActive?: boolean
}

export default function LandingHeroAtmosphere({
  className = "",
  compact = false,
  mobileGlowBoost = false,
  motionActive = true,
}: Props) {
  const reduce = useReducedMotion()
  const staticLayers = reduce || !motionActive

  const haloStyle = {
    background:
      mobileGlowBoost || compact
        ? "radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(79,70,229,0.03) 42%, transparent 72%)"
        : "radial-gradient(circle, rgba(139,92,246,0.06) 0%, rgba(79,70,229,0.025) 40%, transparent 70%)",
    filter: "blur(28px)",
    WebkitFilter: "blur(28px)",
  } as const

  return (
    <motion.div
      className={`pointer-events-none absolute inset-0 max-lg:overflow-x-clip ${
        compact
          ? "lg:inset-[-6%] xl:inset-[-10%]"
          : "lg:inset-[-12%] xl:inset-[-16%] 2xl:inset-[-18%]"
      } ${className}`}
      aria-hidden
    >
      <motion.div
        className="absolute left-1/2 top-1/2 h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2"
        style={haloStyle}
        animate={
          staticLayers
            ? undefined
            : {
                opacity: mobileGlowBoost || compact ? [0.32, 0.48, 0.32] : [0.28, 0.42, 0.28],
                scale: [1, 1.02, 1],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[8%] rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(167,139,250,0.03)_60deg,transparent_120deg,rgba(129,140,248,0.02)_200deg,transparent_300deg)]"
        animate={staticLayers ? undefined : { rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-violet-200/70 shadow-[0_0_3px_rgba(167,139,250,0.15)]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
          }}
          animate={
            staticLayers
              ? { opacity: 0.2 }
              : {
                  opacity: [0.1, 0.35, 0.1],
                  y: [0, -4 - (i % 3), 0],
                  x: [0, (i % 2 === 0 ? 2 : -2), 0],
                }
          }
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </motion.div>
  )
}
