export const BETA_WOULD_USE_AGAIN_OPTIONS = ["Yes", "Maybe", "No"] as const
export type BetaWouldUseAgain = (typeof BETA_WOULD_USE_AGAIN_OPTIONS)[number]

export type BetaPostMasterQuickBody = {
  sessionId: string
  trackName?: string | null
  masteringStyle?: string
  masterObjectKey?: string | null
  trackDuration?: number | null
  stereoWidth?: number
  lowEnd?: number
  masterLufs?: number | null
  processingTimeMs?: number | null
  masterRating: number
  likedFeatures: string[]
  improvements: string[]
  optionalComment?: string
  wouldUseAgain: BetaWouldUseAgain
}
