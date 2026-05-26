import type { BetaEngagementLevel } from "../../../lib/adminTypes"

const STYLES: Record<BetaEngagementLevel, string> = {
  low: "bg-slate-100 text-slate-700 ring-slate-200",
  medium: "bg-amber-100 text-amber-900 ring-amber-200",
  high: "bg-emerald-100 text-emerald-800 ring-emerald-200",
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
