import type { AdminFeedbackRow } from "./adminTypes"
import { getNumericSurveyScore, getSurveyValue } from "./betaFeedbackSurveyDisplay"
import { getBetaSurveyFieldsByAnalyticsRole } from "./betaFeedbackSurveySchema"

export type FeedbackSentiment = "positive" | "negative" | "neutral"

export function feedbackSentiment(row: AdminFeedbackRow): FeedbackSentiment {
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
    border: "border-emerald-500/35",
    glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.12)]",
    badge: "bg-emerald-500/15 text-emerald-100 ring-emerald-500/25",
  },
  negative: {
    border: "border-rose-500/40",
    glow: "shadow-[0_0_0_1px_rgba(244,63,94,0.15)]",
    badge: "bg-rose-500/15 text-rose-100 ring-rose-500/25",
  },
  neutral: {
    border: "border-white/[0.1]",
    glow: "",
    badge: "bg-[#2a2a30] text-white/65 ring-white/[0.1]",
  },
}
