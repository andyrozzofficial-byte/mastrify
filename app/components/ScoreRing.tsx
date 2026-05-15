"use client"

import { useId } from "react"

/** Circular readiness ring (0–100) — decorative, matches dashboard mockups */
export default function ScoreRing({
  value,
  size = 160,
  variant = "score",
}: {
  value: number
  size?: number
  /** `percent` — large “44%” center (landing preview). `score` — score + /100. */
  variant?: "score" | "percent"
}) {
  const uid = useId().replace(/:/g, "")
  const gradId = `ringGrad-${uid}`
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (v / 100) * c

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-80 blur-2xl"
        style={{
          background: `conic-gradient(from 200deg, rgba(139,92,246,0.28), rgba(34,211,238,0.2), rgba(139,92,246,0.12))`,
        }}
      />
      <svg width={size} height={size} className="relative -rotate-90 drop-shadow-[0_0_16px_rgba(139,92,246,0.22)]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
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
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {variant === "percent" ? (
          <span className="text-3xl font-bold tabular-nums tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.1)] md:text-[2.125rem]">
            {v}
            <span className="text-[0.55em] font-semibold text-white/90">%</span>
          </span>
        ) : (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Score</span>
            <span className="text-4xl font-bold tabular-nums text-white md:text-5xl">{v}</span>
            <span className="text-xs text-white/66">/ 100</span>
          </>
        )}
      </div>
    </div>
  )
}
