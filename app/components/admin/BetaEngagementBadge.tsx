import type { BetaEngagementLevel } from "../../../lib/adminTypes"

const STYLES: Record<BetaEngagementLevel, string> = {
  low: "bg-white/[0.06] text-white/55 ring-white/10",
  medium: "bg-violet-500/15 text-violet-200 ring-violet-400/25",
  high: "bg-violet-600/25 text-violet-100 ring-violet-400/35 shadow-[0_0_12px_rgba(139,92,246,0.12)]",
}

export function BetaEngagementBadge({
  level,
  score,
}: {
  level: BetaEngagementLevel
  score?: number
}) {
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${STYLES[level]}`}
    >
      {label}
      {score != null ? <span className="font-normal tabular-nums opacity-80">({score})</span> : null}
    </span>
  )
}
