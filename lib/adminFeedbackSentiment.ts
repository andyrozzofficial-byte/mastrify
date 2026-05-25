import type { AdminFeedbackRow } from "./adminTypes"

export type FeedbackSentiment = "positive" | "negative" | "neutral"

export function feedbackSentiment(row: AdminFeedbackRow): FeedbackSentiment {
  const issues = (row.survey.soundedOff ?? []).filter((s) => s !== "No, it sounded good")
  if (row.recommend_score <= 5 || issues.length >= 2) return "negative"
  if (row.recommend_score >= 8 && issues.length === 0) return "positive"
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
