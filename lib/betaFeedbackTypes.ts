/** Auto-attached session/settings metadata (not shown in the survey UI). */
export type BetaFeedbackSessionAnalytics = {
  sessionId: string
  trackName: string | null
  trackDuration: number | null
  masteringStyle: string
  stereoWidth: number
  lowEnd: number
  masterLufs: number | null
  processingTimeMs: number | null
}

export type BetaFeedbackPayload = {
  role: string
  genre: string
  comparison: string
  stoodOut: string[]
  soundedOff: string[]
  easeRating: number
  speedPerception: string
  releaseReady: string
  wouldRelease: string
  useAgainScore: number
  recommendScore: number
  missing: string
  oneChange: string
  worthPaying: string
  additional: string
  contactEmail: string
  contactDiscord: string
  futureBetaContact: boolean | null
  masterObjectKey: string | null
  trackTitle: string | null
  sessionId: string
  trackName: string | null
  trackDuration: number | null
  masteringStyle: string
  stereoWidth: number
  lowEnd: number
  masterLufs: number | null
  processingTimeMs: number | null
}

export const BETA_FEEDBACK_ROLE_OPTIONS = [
  "Artist",
  "Producer",
  "Mix Engineer",
  "DJ",
  "Hobby Creator",
  "Other",
] as const

export const BETA_FEEDBACK_GENRE_OPTIONS = [
  "Hip-hop / Rap",
  "Pop",
  "EDM / House",
  "Techno",
  "R&B",
  "Rock",
  "Ambient / Experimental",
  "Other",
] as const

export const BETA_FEEDBACK_COMPARISON_OPTIONS = [
  "Much better",
  "Noticeably better",
  "Slightly better",
  "No major difference",
  "Worse than the original",
] as const

export const BETA_FEEDBACK_STOOD_OUT_OPTIONS = [
  "Loudness / punch",
  "Clarity",
  "Stereo width",
  "Frequency balance",
  "Bass response",
  "Commercial / professional sound",
  "Preserved the vibe of the mix",
  "Other",
] as const

export const BETA_FEEDBACK_SOUNDED_OFF_OPTIONS = [
  "Too compressed",
  "Harsh highs",
  "Too much bass",
  "Too flat / lifeless",
  "Too aggressive",
  "Lost too much dynamics",
  "No, it sounded good",
  "Other",
] as const

export const BETA_FEEDBACK_SPEED_OPTIONS = [
  "Much faster than expected",
  "Faster than expected",
  "About what I expected",
  "Slower than expected",
  "Too slow",
] as const

export const BETA_FEEDBACK_RELEASE_READY_OPTIONS = [
  "Yes, absolutely",
  "Almost",
  "Needed small tweaks",
  "No",
] as const

export const BETA_FEEDBACK_WOULD_RELEASE_OPTIONS = ["Yes", "Maybe", "No"] as const
