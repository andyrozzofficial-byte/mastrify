"use client"

import type { AdminFeedbackRow } from "../../../lib/adminTypes"
import { getSurveyValue } from "../../../lib/betaFeedbackSurveyDisplay"

function formatProcessingMs(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null
  return `${(ms / 1000).toFixed(1)}s`
}

function formatLufs(lufs: number | null | undefined): string | null {
  if (lufs == null || !Number.isFinite(lufs)) return null
  const n = lufs <= 0 ? lufs : -lufs
  return `${n.toFixed(1)} LUFS`
}

function FeedbackMetaBadges({ row }: { row: AdminFeedbackRow }) {
  const style = row.mastering_style?.trim() || String(getSurveyValue(row.survey, "masteringStyle") ?? "").trim()
  const genre =
    row.genre && row.genre !== "Unknown"
      ? row.genre
      : String(getSurveyValue(row.survey, "genre") ?? "").trim()
  const proc = formatProcessingMs(row.processing_time_ms)
  const lufs = formatLufs(row.master_lufs)

  const chips: { icon: string; text: string }[] = []
  if (proc) chips.push({ icon: "⏱", text: proc })
  if (lufs) chips.push({ icon: "📈", text: lufs })
  if (style) chips.push({ icon: "🎛", text: style })
  if (genre && genre !== "—") chips.push({ icon: "🎵", text: genre })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Chip key={c.text} icon={c.icon}>
          {c.text}
        </Chip>
      ))}
    </div>
  )
}

function Chip({
  icon,
  children,
  tone = "neutral",
}: {
  icon: string
  children: React.ReactNode
  tone?: "neutral" | "good" | "warn" | "bad"
}) {
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "bad"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-slate-300 bg-slate-50 text-slate-800"
  return (
    <span
      className={`inline-flex max-w-full min-h-[44px] items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-medium max-md:min-h-0 max-md:py-1 ${cls}`}
    >
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      <span className="line-clamp-2 min-w-0 break-words">{children}</span>
    </span>
  )
}

export function FeedbackQuickBadges({ row }: { row: AdminFeedbackRow }) {
  const stage = row.feedback_stage
  const off = getSurveyValue(row.survey, "soundedOff")
  const issues = Array.isArray(off)
    ? off.map(String).filter((s) => s !== "No, it sounded good")
    : []
  const topIssue = issues[0]
  const wouldRelease =
    stage === "completed"
      ? row.survey.wouldRelease || row.release_ready
      : String(getSurveyValue(row.survey, "wouldRelease") ?? "—")
  const genre =
    stage === "completed" ? row.genre : String(getSurveyValue(row.survey, "genre") ?? "—")
  const recommend =
    stage === "completed"
      ? row.recommend_score
      : (getSurveyValue(row.survey, "recommendScore") as number | undefined)

  if (stage === "analysis") {
    const acc = String(getSurveyValue(row.survey, "analysisAccuracy") ?? "—")
    return (
      <div className="space-y-2">
        <FeedbackMetaBadges row={row} />
        <div className="flex flex-wrap gap-1.5">
          <Chip icon="📊" tone={acc === "Yes" ? "good" : acc === "No" ? "bad" : "warn"}>
            Analysis: {acc}
          </Chip>
        </div>
      </div>
    )
  }

  if (stage === "preview") {
    const cmp = String(getSurveyValue(row.survey, "previewComparison") ?? "—")
    return (
      <div className="space-y-2">
        <FeedbackMetaBadges row={row} />
        <div className="flex flex-wrap gap-1.5">
          <Chip icon="🔊" tone={cmp === "Better" ? "good" : cmp === "Worse" ? "bad" : "neutral"}>
            {cmp}
          </Chip>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <FeedbackMetaBadges row={row} />
      <div className="flex flex-wrap gap-1.5">
      {typeof recommend === "number" && recommend > 0 ? (
        <Chip
          icon="⭐"
          tone={recommend >= 8 ? "good" : recommend <= 5 ? "bad" : "neutral"}
        >
          {recommend}/10
        </Chip>
      ) : null}
      {topIssue ? (
        <Chip icon="⚠️" tone="bad">
          {topIssue}
        </Chip>
      ) : (
        <Chip icon="✓" tone="good">
          No issues
        </Chip>
      )}
      <Chip
        icon="🚀"
        tone={
          row.release_ready === "Yes, absolutely" || row.release_ready === "Almost"
            ? "good"
            : "neutral"
        }
      >
        Release: {row.release_ready}
      </Chip>
      <Chip icon="👍" tone={wouldRelease === "Yes" ? "good" : "neutral"}>
        Would release: {wouldRelease || "—"}
      </Chip>
      </div>
    </div>
  )
}

export function feedbackHoverPreviewLines(row: AdminFeedbackRow): string[] {
  const lines: string[] = []
  if (row.feedback_stage === "analysis") {
    lines.push(`Analysis: ${getSurveyValue(row.survey, "analysisAccuracy") ?? "—"}`)
    const wrong = getSurveyValue(row.survey, "analysisFeelsWrong")
    if (typeof wrong === "string" && wrong.trim()) lines.push(wrong.trim())
    return lines
  }
  if (row.feedback_stage === "preview") {
    lines.push(`Compare: ${getSurveyValue(row.survey, "previewComparison") ?? "—"}`)
    const stood = getSurveyValue(row.survey, "previewStoodOut")
    if (Array.isArray(stood) && stood.length) lines.push(`Stood out: ${stood.join(", ")}`)
    return lines
  }
  lines.push(`${row.recommend_score}/10 recommend · ${row.use_again_score}/10 use again`)
  const off = row.survey.soundedOff?.filter((s) => s !== "No, it sounded good") ?? []
  if (off.length) lines.push(`Issues: ${off.join(", ")}`)
  else lines.push("No sound issues reported")
  if (row.survey.stoodOut?.length) lines.push(`Good: ${row.survey.stoodOut.slice(0, 3).join(", ")}`)
  const note = row.survey.additional?.trim() || row.survey.missing?.trim()
  if (note) lines.push(note.slice(0, 140) + (note.length > 140 ? "…" : ""))
  return lines
}
