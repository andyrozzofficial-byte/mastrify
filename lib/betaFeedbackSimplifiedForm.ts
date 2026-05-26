import type { BetaFeedbackPayload, BetaFeedbackSessionAnalytics } from "./betaFeedbackTypes"
import {
  BETA_FEEDBACK_COMPARISON_OPTIONS,
  BETA_FEEDBACK_GENRE_OPTIONS,
  BETA_FEEDBACK_RELEASE_READY_OPTIONS,
  BETA_FEEDBACK_ROLE_OPTIONS,
  BETA_FEEDBACK_SPEED_OPTIONS,
  BETA_FEEDBACK_WOULD_RELEASE_OPTIONS,
} from "./betaFeedbackTypes"

/** Simplified genre picker on the result feedback card (maps to full survey genres). */
export const BETA_RESULT_GENRE_OPTIONS = [
  { label: "EDM / House", value: "EDM / House" },
  { label: "Pop", value: "Pop" },
  { label: "Hip-hop / Rap", value: "Hip-hop / Rap" },
  { label: "Other", value: "Other" },
] as const

export type BetaSimplifiedFeedbackInput = {
  masterRating: number
  soundedGood: string
  couldImprove: string
  wouldUseAgain: (typeof BETA_FEEDBACK_WOULD_RELEASE_OPTIONS)[number]
  role: string
  genre: string
  masterObjectKey: string | null
  sessionAnalytics: BetaFeedbackSessionAnalytics
  contactEmail?: string
}

function comparisonFromRating(rating: number): string {
  if (rating >= 9) return "Much better"
  if (rating >= 7) return "Noticeably better"
  if (rating >= 5) return "Slightly better"
  if (rating >= 3) return "No major difference"
  return "Worse than the original"
}

function releaseReadyFromRating(rating: number): string {
  if (rating >= 8) return "Yes, absolutely"
  if (rating >= 6) return "Almost"
  if (rating >= 4) return "Needed small tweaks"
  return "No"
}

function useAgainScoreFromChoice(choice: string): number {
  if (choice === "Yes") return 9
  if (choice === "Maybe") return 5
  return 2
}

/** Map the result-page card into the original beta_master_feedback survey payload. */
export function buildBetaFeedbackPayloadFromSimplified(
  input: BetaSimplifiedFeedbackInput,
): BetaFeedbackPayload {
  const rating = Math.min(10, Math.max(1, Math.round(input.masterRating)))
  const soundedGood = input.soundedGood.trim()
  const couldImprove = input.couldImprove.trim()
  const role = BETA_FEEDBACK_ROLE_OPTIONS.includes(input.role as (typeof BETA_FEEDBACK_ROLE_OPTIONS)[number])
    ? input.role
    : "Other"
  const genre = BETA_FEEDBACK_GENRE_OPTIONS.includes(
    input.genre as (typeof BETA_FEEDBACK_GENRE_OPTIONS)[number],
  )
    ? input.genre
    : "Other"
  const comparisonRaw = comparisonFromRating(rating)
  const comparison = BETA_FEEDBACK_COMPARISON_OPTIONS.includes(
    comparisonRaw as (typeof BETA_FEEDBACK_COMPARISON_OPTIONS)[number],
  )
    ? comparisonRaw
    : "Slightly better"
  const releaseReady = releaseReadyFromRating(rating)
  const wouldRelease = BETA_FEEDBACK_WOULD_RELEASE_OPTIONS.includes(
    input.wouldUseAgain as (typeof BETA_FEEDBACK_WOULD_RELEASE_OPTIONS)[number],
  )
    ? input.wouldUseAgain
    : "Maybe"

  const { sessionAnalytics } = input

  return {
    role,
    genre,
    comparison,
    stoodOut: soundedGood ? ["Other"] : [],
    soundedOff: couldImprove ? ["Other"] : ["No, it sounded good"],
    easeRating: 4,
    speedPerception: "About what I expected",
    releaseReady: BETA_FEEDBACK_RELEASE_READY_OPTIONS.includes(
      releaseReady as (typeof BETA_FEEDBACK_RELEASE_READY_OPTIONS)[number],
    )
      ? releaseReady
      : "Almost",
    wouldRelease,
    useAgainScore: useAgainScoreFromChoice(wouldRelease),
    recommendScore: rating,
    missing: "",
    oneChange: couldImprove,
    worthPaying: "",
    additional: soundedGood,
    contactEmail: input.contactEmail?.trim() ?? "",
    contactDiscord: "",
    futureBetaContact: null,
    masterObjectKey: input.masterObjectKey,
    trackTitle: sessionAnalytics.trackName,
    sessionId: sessionAnalytics.sessionId,
    trackName: sessionAnalytics.trackName,
    trackDuration: sessionAnalytics.trackDuration,
    masteringStyle: sessionAnalytics.masteringStyle,
    stereoWidth: Math.round(sessionAnalytics.stereoWidth),
    lowEnd: Math.round(sessionAnalytics.lowEnd),
    masterLufs: sessionAnalytics.masterLufs,
    processingTimeMs: sessionAnalytics.processingTimeMs,
  }
}
