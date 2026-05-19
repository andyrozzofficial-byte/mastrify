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
}

export default function LandingHeroAtmosphere({
  className = "",
  compact = false,
  mobileGlowBoost = false,
}: Props) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={`pointer-events-none absolute inset-0 max-lg:overflow-hidden ${
        compact
          ? "lg:inset-[-6%] xl:inset-[-10%]"
          : "lg:inset-[-12%] xl:inset-[-16%] 2xl:inset-[-18%]"
      } ${className}`}
      aria-hidden
    >
      <motion.div
        className={`absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${
          mobileGlowBoost || compact
            ? "bg-[radial-gradient(circle,rgba(139,92,246,0.26)_0%,rgba(79,70,229,0.1)_42%,transparent_70%)]"
            : "bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,rgba(79,70,229,0.08)_40%,transparent_68%)]"
        }`}
        animate={
          reduce
            ? undefined
            : {
                opacity: mobileGlowBoost || compact ? [0.52, 0.78, 0.52] : [0.5, 0.75, 0.5],
                scale: [1, 1.04, 1],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute left-1/2 top-[42%] h-[55%] w-[70%] -translate-x-1/2 rounded-full blur-3xl ${
          mobileGlowBoost || compact
            ? "bg-[radial-gradient(ellipse,rgba(56,189,248,0.11)_0%,transparent_72%)]"
            : "bg-[radial-gradient(ellipse,rgba(56,189,248,0.08)_0%,transparent_70%)]"
        }`}
        animate={
          reduce ? undefined : { opacity: mobileGlowBoost || compact ? [0.38, 0.58, 0.38] : [0.35, 0.55, 0.35] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute inset-[8%] rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(167,139,250,0.04)_60deg,transparent_120deg,rgba(125,211,252,0.03)_200deg,transparent_300deg)]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-violet-200/80 shadow-[0_0_6px_rgba(167,139,250,0.35)]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
          }}
          animate={
            reduce
              ? { opacity: 0.25 }
              : {
                  opacity: [0.12, 0.45, 0.12],
                  y: [0, -6 - (i % 3), 0],
                  x: [0, (i % 2 === 0 ? 3 : -3), 0],
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
