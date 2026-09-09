"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useId } from "react"

/** Circular readiness ring (0–100) — decorative, analyze results centerpiece */
export default function ScoreRing({
  value,
  size = 160,
  variant = "score",
  prominent = false,
  className = "",
}: {
  value: number
  size?: number
  /** `percent` — large center value (analyze results). `score` — score + /100. */
  variant?: "score" | "percent"
  /** Larger glow, shimmer, and soft pulse — analyze hero */
  prominent?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const uid = useId().replace(/:/g, "")
  const gradId = `ringGrad-${uid}`
  const shimmerId = `ringShimmer-${uid}`
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const stroke = prominent ? 11 : 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (v / 100) * c

  return (
    <motion.div
      className={`relative flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      animate={
        prominent && !reduce
          ? {
              filter: [
                "drop-shadow(0 0 14px rgba(139,92,246,0.08))",
                "drop-shadow(0 0 18px rgba(99,102,241,0.10))",
                "drop-shadow(0 0 14px rgba(139,92,246,0.08))",
              ],
            }
          : undefined
      }
      transition={prominent && !reduce ? { duration: 5, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {prominent ? (
        <>
          <motion.div
            className="pointer-events-none absolute inset-[-24%] rounded-full bg-violet-500/[0.08] blur-[36px]"
            aria-hidden
            animate={reduce ? undefined : { opacity: [0.22, 0.36, 0.22] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute inset-[-8%] rounded-full opacity-25 blur-xl"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(196,181,253,0.12) 60deg, transparent 120deg, rgba(139,92,246,0.08) 200deg, transparent 280deg)",
            }}
            aria-hidden
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          />
        </>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-60 blur-xl"
          style={{
            background:
              "conic-gradient(from 200deg, rgba(139,92,246,0.16), rgba(99,102,241,0.10), rgba(139,92,246,0.08))",
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        className={`relative -rotate-90 ${prominent ? "drop-shadow-[0_0_10px_rgba(139,92,246,0.06)]" : "drop-shadow-[0_0_6px_rgba(139,92,246,0.05)]"}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        {prominent && !reduce ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${shimmerId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.12} ${c * 0.88}`}
            strokeDashoffset={0}
            className="score-ring-shimmer-stroke"
          />
        ) : null}
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            {variant === "percent" ? (
              <>
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="40%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#6366f1" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="55%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#818cf8" />
              </>
            )}
          </linearGradient>
          <linearGradient id={shimmerId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {variant === "percent" ? (
          <span
            className={`font-bold tabular-nums tracking-tight text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.14)] ${
              prominent ? "text-[2.35rem] sm:text-[2.55rem] md:text-[2.65rem]" : "text-3xl md:text-[2.125rem]"
            }`}
          >
            {v}
            <span className="text-[0.52em] font-semibold text-white/90">%</span>
          </span>
        ) : (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Score</span>
            <span className="text-4xl font-bold tabular-nums text-white md:text-5xl">{v}</span>
            <span className="text-xs text-white/66">/ 100</span>
          </>
        )}
        {prominent && variant === "percent" ? (
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-200/58">
            Readiness
          </span>
        ) : null}
      </div>
    </motion.div>
  )
}
