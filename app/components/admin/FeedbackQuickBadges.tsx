"use client"

import type { AdminFeedbackRow } from "../../../lib/adminTypes"
import { getSurveyValue } from "../../../lib/betaFeedbackSurveyDisplay"

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
          : "border-slate-200 bg-slate-50 text-slate-700"
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${cls}`}>
      <span aria-hidden>{icon}</span>
      {children}
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
      <div className="flex flex-wrap gap-1.5">
        <Chip icon="📊" tone={acc === "Yes" ? "good" : acc === "No" ? "bad" : "warn"}>
          Analysis: {acc}
        </Chip>
      </div>
    )
  }

  if (stage === "preview") {
    const cmp = String(getSurveyValue(row.survey, "previewComparison") ?? "—")
    return (
      <div className="flex flex-wrap gap-1.5">
        <Chip icon="🔊" tone={cmp === "Better" ? "good" : cmp === "Worse" ? "bad" : "neutral"}>
          {cmp}
        </Chip>
        <Chip icon="🎵">{genre !== "—" ? genre : "Preview"}</Chip>
      </div>
    )
  }

  return (
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
      <Chip icon="🎵">{genre}</Chip>
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
