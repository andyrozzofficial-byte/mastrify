import type { AdminFeedbackRow } from "./adminTypes"
import { getNumericSurveyScore, getSurveyValue } from "./betaFeedbackSurveyDisplay"
import { getBetaSurveyFieldsByAnalyticsRole } from "./betaFeedbackSurveySchema"

export type FeedbackSentiment = "positive" | "negative" | "neutral"

export function feedbackSentiment(row: AdminFeedbackRow): FeedbackSentiment {
  if (row.feedback_stage === "analysis") {
    const acc = String(getSurveyValue(row.survey, "analysisAccuracy") ?? "")
    if (acc === "No") return "negative"
    if (acc === "Yes") return "positive"
    return "neutral"
  }
  if (row.feedback_stage === "preview") {
    const cmp = String(getSurveyValue(row.survey, "previewComparison") ?? "")
    if (cmp === "Worse") return "negative"
    if (cmp === "Better") return "positive"
    return "neutral"
  }

  const issuesField = getBetaSurveyFieldsByAnalyticsRole("sounded_off_tags")[0]
  const recommendField = getBetaSurveyFieldsByAnalyticsRole("recommend_score")[0]
  const issuesKey = issuesField?.key ?? "soundedOff"
  const recommendKey = recommendField?.key ?? "recommendScore"

  const off = getSurveyValue(row.survey, issuesKey)
  const issues = Array.isArray(off)
    ? off.map(String).filter((s) => s !== "No, it sounded good")
    : []
  const recommend = getNumericSurveyScore(row.survey, recommendKey) ?? row.recommend_score

  if (recommend <= 5 || issues.length >= 2) return "negative"
  if (recommend >= 8 && issues.length === 0) return "positive"
  return "neutral"
}

export const FEEDBACK_SENTIMENT_STYLES: Record<
  FeedbackSentiment,
  { border: string; glow: string; badge: string }
> = {
  positive: {
    border: "border-emerald-300",
    glow: "shadow-sm shadow-emerald-100/80",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  negative: {
    border: "border-rose-300",
    glow: "shadow-sm shadow-rose-100/80",
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
  },
  neutral: {
    border: "border-slate-200",
    glow: "shadow-sm shadow-slate-200/50",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
  },
}
