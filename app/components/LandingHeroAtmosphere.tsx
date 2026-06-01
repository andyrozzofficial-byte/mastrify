"use client"

import { useReducedMotion } from "framer-motion"

const PARTICLES_FULL = Array.from({ length: 14 }, (_, i) => ({
  left: `${8 + ((i * 13.7) % 84)}%`,
  top: `${10 + ((i * 17.3) % 80)}%`,
  size: 1 + (i % 3) * 0.45,
}))

const PARTICLES_LITE = PARTICLES_FULL.slice(0, 6)

type Props = {
  className?: string
  compact?: boolean
  mobileGlowBoost?: boolean
  /** Marketing hero: fewer blurs/particles, CSS opacity pulse only */
  efficient?: boolean
}

export default function LandingHeroAtmosphere({
  className = "",
  compact = false,
  mobileGlowBoost = false,
  efficient = false,
}: Props) {
  const reduce = useReducedMotion()
  const particles = efficient ? PARTICLES_LITE : PARTICLES_FULL
  const inset = efficient
    ? "inset-0"
    : compact
      ? "lg:inset-[-6%] xl:inset-[-10%]"
      : "lg:inset-[-12%] xl:inset-[-16%] 2xl:inset-[-18%]"
  const animateParticles = !reduce && !efficient

  return (
    <div
      className={`pointer-events-none absolute ${inset} max-lg:overflow-x-clip max-lg:overflow-y-visible ${className}`}
      aria-hidden
    >
      <div
        className={`engine-halo-breathe absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
          efficient ? "blur-xl" : "blur-2xl"
        } ${
          mobileGlowBoost || compact
            ? "bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,rgba(79,70,229,0.07)_42%,transparent_70%)]"
            : "bg-[radial-gradient(circle,rgba(139,92,246,0.14)_0%,rgba(79,70,229,0.06)_40%,transparent_68%)]"
        }`}
        style={reduce ? { opacity: efficient ? 0.42 : 0.58 } : efficient ? { opacity: 0.49 } : undefined}
      />
      {!efficient ? (
        <div
          className={`marketing-ambient-pulse absolute left-1/2 top-[42%] h-[55%] w-[70%] -translate-x-1/2 rounded-full blur-3xl max-md:opacity-45 ${
            mobileGlowBoost || compact
              ? "bg-[radial-gradient(ellipse,rgba(56,189,248,0.11)_0%,transparent_72%)]"
              : "bg-[radial-gradient(ellipse,rgba(56,189,248,0.08)_0%,transparent_70%)]"
          }`}
          style={reduce ? { opacity: 0.45 } : undefined}
        />
      ) : null}
      <div
        className="absolute inset-[8%] rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,transparent_0deg,rgba(167,139,250,0.04)_60deg,transparent_120deg,rgba(125,211,252,0.03)_200deg,transparent_300deg)] opacity-80"
        aria-hidden
      />
      {particles.map((p, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-violet-200/80 ${
            animateParticles ? "landing-particle-drift" : "opacity-[0.28]"
          }`}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: animateParticles ? `${i * 0.35}s` : undefined,
          }}
        />
      ))}
    </div>
  )
}
