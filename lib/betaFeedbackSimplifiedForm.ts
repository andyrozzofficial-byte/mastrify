import {
  formatChipSelections,
  soundedOffTagsFromImprovementChips,
  stoodOutTagsFromLikedChips,
} from "./betaFeedbackChipOptions"
import type { BetaFeedbackPayload, BetaFeedbackSessionAnalytics } from "./betaFeedbackTypes"
import {
  BETA_FEEDBACK_COMPARISON_OPTIONS,
  BETA_FEEDBACK_GENRE_OPTIONS,
  BETA_FEEDBACK_RELEASE_READY_OPTIONS,
  BETA_FEEDBACK_ROLE_OPTIONS,
  BETA_FEEDBACK_SOUNDED_OFF_OPTIONS,
  BETA_FEEDBACK_SPEED_OPTIONS,
  BETA_FEEDBACK_STOOD_OUT_OPTIONS,
  BETA_FEEDBACK_WOULD_RELEASE_OPTIONS,
} from "./betaFeedbackTypes"
import { BETA_DAW_OPTIONS } from "./betaAccess"

export const BETA_RESULT_GENRE_OPTIONS = [
  { label: "EDM / House", value: "EDM / House" },
  { label: "Pop", value: "Pop" },
  { label: "Hip-hop / Rap", value: "Hip-hop / Rap" },
  { label: "Rock", value: "Rock" },
  { label: "Techno", value: "Techno" },
  { label: "Other", value: "Other" },
] as const

/** UI labels → stored DAW values (admin_customer_profiles / beta access). */
export const BETA_RESULT_DAW_OPTIONS = [
  { label: "Logic Pro", value: "Logic Pro" },
  { label: "FL Studio", value: "FL Studio" },
  { label: "Ableton", value: "Ableton Live" },
  { label: "Cubase", value: "Cubase" },
  { label: "Pro Tools", value: "Pro Tools" },
  { label: "Studio One", value: "Studio One" },
  { label: "Other", value: "Other" },
] as const

export const BETA_LOUDNESS_OPTIONS = ["Too quiet", "Balanced", "Too loud"] as const
export const BETA_LOW_END_OPTIONS = ["Weak", "Balanced", "Too strong"] as const
export const BETA_STEREO_OPTIONS = ["Too narrow", "Balanced", "Too wide"] as const
export const BETA_CLARITY_OPTIONS = ["Needs work", "Good", "Excellent"] as const

export type BetaResultFeedbackInput = {
  masterRating: number
  likedFeatures: string[]
  improvements: string[]
  optionalComment: string
  wouldUseAgain: (typeof BETA_FEEDBACK_WOULD_RELEASE_OPTIONS)[number]
  role: string
  genre: string
  daw: string
  loudness: (typeof BETA_LOUDNESS_OPTIONS)[number]
  lowEnd: (typeof BETA_LOW_END_OPTIONS)[number]
  stereoImage: (typeof BETA_STEREO_OPTIONS)[number]
  clarity: (typeof BETA_CLARITY_OPTIONS)[number]
  masterObjectKey: string | null
  sessionAnalytics: BetaFeedbackSessionAnalytics
  contactEmail?: string
}

function pickOption<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
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

function easeRatingFromExperience(
  loudness: string,
  clarity: string,
): number {
  let score = 3
  if (loudness === "Balanced") score += 1
  if (clarity === "Good" || clarity === "Excellent") score += 1
  if (clarity === "Needs work" || loudness === "Too quiet") score -= 1
  return Math.min(5, Math.max(1, score))
}

function experienceToTags(input: {
  loudness: string
  lowEnd: string
  stereoImage: string
  clarity: string
}): { stoodOut: string[]; soundedOff: string[] } {
  const stoodOut = new Set<string>()
  const soundedOff = new Set<string>()

  if (input.loudness === "Balanced") stoodOut.add("Loudness / punch")
  if (input.loudness === "Too quiet") soundedOff.add("Too flat / lifeless")
  if (input.loudness === "Too loud") soundedOff.add("Too compressed")

  if (input.lowEnd === "Balanced") stoodOut.add("Bass response")
  if (input.lowEnd === "Weak") soundedOff.add("Too flat / lifeless")
  if (input.lowEnd === "Too strong") soundedOff.add("Too much bass")

  if (input.stereoImage === "Balanced") stoodOut.add("Stereo width")
  if (input.stereoImage === "Too narrow" || input.stereoImage === "Too wide") {
    stoodOut.add("Other")
    soundedOff.add("Other")
  }

  if (input.clarity === "Good" || input.clarity === "Excellent") stoodOut.add("Clarity")
  if (input.clarity === "Excellent") stoodOut.add("Commercial / professional sound")
  if (input.clarity === "Needs work") soundedOff.add("Harsh highs")

  const filterStood = [...stoodOut].filter((t) =>
    (BETA_FEEDBACK_STOOD_OUT_OPTIONS as readonly string[]).includes(t),
  )
  const filterOff = [...soundedOff].filter((t) =>
    (BETA_FEEDBACK_SOUNDED_OFF_OPTIONS as readonly string[]).includes(t),
  )

  return {
    stoodOut: filterStood.length ? filterStood : ["Other"],
    soundedOff: filterOff.length ? filterOff : ["No, it sounded good"],
  }
}

function sessionNotesBlock(input: BetaResultFeedbackInput): string {
  const lines = [
    `DAW: ${input.daw}`,
    `Loudness: ${input.loudness}`,
    `Low-end: ${input.lowEnd}`,
    `Stereo image: ${input.stereoImage}`,
    `Clarity: ${input.clarity}`,
  ]
  if (input.optionalComment.trim()) {
    lines.push("", "Additional comments:", input.optionalComment.trim())
  }
  return lines.join("\n")
}

/** Map the unified result-page form into the original beta_master_feedback survey payload. */
export function buildBetaFeedbackPayloadFromResultForm(input: BetaResultFeedbackInput): BetaFeedbackPayload {
  const rating = Math.min(10, Math.max(1, Math.round(input.masterRating)))
  const likedFeatures = input.likedFeatures.filter(Boolean)
  const improvements = input.improvements.filter(Boolean)
  const optionalComment = input.optionalComment.trim()
  const soundedGood = formatChipSelections(likedFeatures)
  const couldImprove = formatChipSelections(improvements)
  const role = pickOption(input.role, BETA_FEEDBACK_ROLE_OPTIONS, "Other")
  const genre = pickOption(input.genre, BETA_FEEDBACK_GENRE_OPTIONS, "Other")
  const daw = BETA_DAW_OPTIONS.includes(input.daw as (typeof BETA_DAW_OPTIONS)[number]) ? input.daw : "Other"

  const comparisonRaw = comparisonFromRating(rating)
  const comparison = pickOption(comparisonRaw, BETA_FEEDBACK_COMPARISON_OPTIONS, "Slightly better")
  const releaseReady = pickOption(
    releaseReadyFromRating(rating),
    BETA_FEEDBACK_RELEASE_READY_OPTIONS,
    "Almost",
  )
  const wouldRelease = pickOption(input.wouldUseAgain, BETA_FEEDBACK_WOULD_RELEASE_OPTIONS, "Maybe")

  const expTags = experienceToTags({
    loudness: input.loudness,
    lowEnd: input.lowEnd,
    stereoImage: input.stereoImage,
    clarity: input.clarity,
  })

  const stoodOut = [...new Set([...expTags.stoodOut, ...stoodOutTagsFromLikedChips(likedFeatures)])]
  const soundedOff = [
    ...new Set([...expTags.soundedOff, ...soundedOffTagsFromImprovementChips(improvements)]),
  ]

  if (likedFeatures.length > 0 && !stoodOut.length) stoodOut.push("Other")
  if (
    improvements.length > 0 &&
    !soundedOff.includes("Other") &&
    !soundedOff.includes("No, it sounded good")
  ) {
    soundedOff.push("Other")
  }

  const { sessionAnalytics } = input
  const sessionBlock = sessionNotesBlock({ ...input, daw })

  return {
    role,
    genre,
    comparison,
    stoodOut,
    soundedOff,
    easeRating: easeRatingFromExperience(input.loudness, input.clarity),
    speedPerception: "About what I expected",
    releaseReady,
    wouldRelease,
    useAgainScore: useAgainScoreFromChoice(wouldRelease),
    recommendScore: rating,
    missing: sessionBlock,
    oneChange: couldImprove,
    worthPaying: `DAW: ${daw}`,
    additional: optionalComment
      ? [soundedGood, "", "Optional comment:", optionalComment].filter(Boolean).join("\n")
      : soundedGood,
    liked_features: likedFeatures,
    improvements,
    optional_comment: optionalComment,
    loudnessRating: input.loudness,
    lowEndRating: input.lowEnd,
    stereoRating: input.stereoImage,
    clarityRating: input.clarity,
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

/** @deprecated Use buildBetaFeedbackPayloadFromResultForm */
export const buildBetaFeedbackPayloadFromSimplified = buildBetaFeedbackPayloadFromResultForm
export type BetaSimplifiedFeedbackInput = BetaResultFeedbackInput
