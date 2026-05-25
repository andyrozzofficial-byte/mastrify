export const BETA_FEEDBACK_STAGES = ["analysis", "preview", "completed"] as const
export type BetaFeedbackStage = (typeof BETA_FEEDBACK_STAGES)[number]

export const ANALYSIS_ACCURACY_OPTIONS = ["Yes", "Somewhat", "No"] as const

export const PREVIEW_COMPARISON_OPTIONS = ["Better", "Similar", "Worse"] as const

export const PREVIEW_STOOD_OUT_OPTIONS = [
  "Punch",
  "Clarity",
  "Loudness",
  "Stereo width",
  "Bass",
  "Dynamics",
  "Other",
] as const

export type BetaFeedbackPulseAnalysis = {
  feedbackStage: "analysis"
  sessionId: string
  trackName?: string | null
  analysisAccuracy: string
  analysisFeelsWrong?: string
}

export type BetaFeedbackPulsePreview = {
  feedbackStage: "preview"
  sessionId: string
  trackName?: string | null
  masteringStyle?: string
  previewComparison: string
  previewStoodOut: string[]
}

export type BetaFeedbackPulseBody = BetaFeedbackPulseAnalysis | BetaFeedbackPulsePreview

export function isBetaFeedbackStage(v: string): v is BetaFeedbackStage {
  return (BETA_FEEDBACK_STAGES as readonly string[]).includes(v)
}
