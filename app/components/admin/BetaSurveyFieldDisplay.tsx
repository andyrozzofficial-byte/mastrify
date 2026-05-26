"use client"

import type { BetaSurveyDisplayEntry } from "../../../lib/betaFeedbackSurveyDisplay"

function TagList({
  items,
  tone,
}: {
  items: string[]
  tone?: "positive" | "negative" | "neutral"
}) {
  if (items.length === 0) return <p className="text-sm text-white/45">—</p>
  const cls =
    tone === "positive"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
      : tone === "negative"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
        : "border-white/[0.1] bg-[#2a2a30] text-white/75"
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={`rounded-lg border px-2.5 py-1 text-[13px] ${cls}`}>
          {item}
        </li>
      ))}
    </ul>
  )
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = (value / max) * 100
  const tone = value >= max * 0.8 ? "text-emerald-300" : value <= max * 0.5 ? "text-rose-300" : "text-white"
  return (
    <div>
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
        <span className="text-base font-normal text-white/35"> / {max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${value >= max * 0.8 ? "bg-emerald-500/80" : value <= max * 0.5 ? "bg-rose-500/75" : "bg-violet-500/70"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function BetaSurveyFieldDisplay({ entry }: { entry: BetaSurveyDisplayEntry }) {
  const { label, hint, kind, value, formatted, isEmpty, tone } = entry

  if (isEmpty && kind !== "textarea") {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#1c1c22]/60 px-4 py-3">
        <p className="text-[14px] font-medium leading-snug text-white/88">{label}</p>
        {hint ? <p className="mt-0.5 text-[12px] text-white/42">{hint}</p> : null}
        <p className="mt-2 text-sm text-white/40">No answer</p>
      </div>
    )
  }

  const boxTone =
    tone === "positive"
      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
      : tone === "negative"
        ? "border-rose-500/20 bg-rose-500/[0.04]"
        : "border-white/[0.08] bg-[#1c1c22]"

  return (
    <div className={`rounded-xl border px-4 py-3 ${boxTone}`}>
      <p className="text-[14px] font-medium leading-snug text-white/88">{label}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-white/42">{hint}</p> : null}

      <div className="mt-3">
        {kind === "checkbox" && Array.isArray(value) ? (
          <TagList items={value.map(String)} tone={tone} />
        ) : kind === "range" && typeof value === "number" ? (
          <ScoreBar
            value={value}
            max={entry.key === "easeRating" ? 5 : 10}
          />
        ) : kind === "textarea" ? (
          isEmpty ? (
            <p className="text-sm text-white/40">No answer</p>
          ) : (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/82">{formatted}</p>
          )
        ) : (
          <p className="line-clamp-2 break-words text-[14px] leading-snug text-white/82" title={formatted}>
            {formatted}
          </p>
        )}
      </div>
    </div>
  )
}
