/**
 * Single source of truth for the beta mastering survey.
 * Add new questions here (+ BetaFeedbackPayload in betaFeedbackTypes.ts) and they
 * appear in BetaFeedbackFlow, admin detail, analytics, and insights automatically.
 */
import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
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

/** How a beta survey field is collected in the user-facing flow. */
export type BetaSurveyFieldKind =
  | "radio"
  | "checkbox"
  | "range"
  | "textarea"
  | "text"
  | "email"
  | "boolean"

/** Drives admin summary charts and insights from real survey keys. */
export type BetaSurveyAnalyticsRole =
  | "genre_distribution"
  | "recommend_score"
  | "use_again_score"
  | "ease_rating"
  | "stood_out_tags"
  | "sounded_off_tags"
  | "release_ready"
  | "text_snippets"

export type BetaSurveyFieldSection = "survey" | "contact" | "session"

export type BetaSurveyFieldDef = {
  key: keyof BetaFeedbackPayload | (string & {})
  label: string
  hint?: string
  kind: BetaSurveyFieldKind
  section: BetaSurveyFieldSection
  required?: boolean
  rangeMin?: number
  rangeMax?: number
  options?: readonly string[]
  analyticsRole?: BetaSurveyAnalyticsRole
  /** Positive / negative styling in admin detail for checkbox tags */
  tone?: "positive" | "negative" | "neutral"
}

/** Ordered survey questions — labels match BetaFeedbackFlow exactly. */
export const BETA_FEEDBACK_SURVEY_FIELDS: readonly BetaSurveyFieldDef[] = [
  {
    key: "role",
    label: "1. Which best describes you?",
    kind: "radio",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_ROLE_OPTIONS,
  },
  {
    key: "genre",
    label: "2. What genre did you test with?",
    kind: "radio",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_GENRE_OPTIONS,
    analyticsRole: "genre_distribution",
  },
  {
    key: "comparison",
    label: "3. How did the mastered version compare to your original mix?",
    kind: "radio",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_COMPARISON_OPTIONS,
  },
  {
    key: "stoodOut",
    label: "4. What stood out most about the master? (Select all that apply)",
    kind: "checkbox",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_STOOD_OUT_OPTIONS,
    analyticsRole: "stood_out_tags",
    tone: "positive",
  },
  {
    key: "soundedOff",
    label: "5. Did anything sound off?",
    kind: "checkbox",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_SOUNDED_OFF_OPTIONS,
    analyticsRole: "sounded_off_tags",
    tone: "negative",
  },
  {
    key: "easeRating",
    label: "6. How easy was the experience?",
    hint: "1 = Confusing · 5 = Extremely smooth",
    kind: "range",
    section: "survey",
    required: true,
    rangeMin: 1,
    rangeMax: 5,
    analyticsRole: "ease_rating",
  },
  {
    key: "speedPerception",
    label: "7. How did you feel about the processing speed?",
    kind: "radio",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_SPEED_OPTIONS,
  },
  {
    key: "releaseReady",
    label: "8. Did the result feel release-ready?",
    kind: "radio",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_RELEASE_READY_OPTIONS,
    analyticsRole: "release_ready",
  },
  {
    key: "wouldRelease",
    label: "9. Would you release a song mastered with this version of Mastrify?",
    kind: "radio",
    section: "survey",
    required: true,
    options: BETA_FEEDBACK_WOULD_RELEASE_OPTIONS,
  },
  {
    key: "useAgainScore",
    label: "10. How likely are you to use this service again?",
    hint: "0–10",
    kind: "range",
    section: "survey",
    required: true,
    rangeMin: 0,
    rangeMax: 10,
    analyticsRole: "use_again_score",
  },
  {
    key: "recommendScore",
    label: "11. How likely are you to recommend Mastrify to a friend or collaborator?",
    hint: "0–10",
    kind: "range",
    section: "survey",
    required: true,
    rangeMin: 0,
    rangeMax: 10,
    analyticsRole: "recommend_score",
  },
  {
    key: "missing",
    label: "12. What did you feel was missing?",
    kind: "textarea",
    section: "survey",
    analyticsRole: "text_snippets",
  },
  {
    key: "oneChange",
    label: "13. If you could change ONE thing immediately, what would it be?",
    kind: "textarea",
    section: "survey",
    analyticsRole: "text_snippets",
  },
  {
    key: "worthPaying",
    label: "14. What would make this service worth paying for?",
    kind: "textarea",
    section: "survey",
    analyticsRole: "text_snippets",
  },
  {
    key: "additional",
    label: "15. Any additional thoughts or feedback?",
    kind: "textarea",
    section: "survey",
    analyticsRole: "text_snippets",
  },
] as const

export const BETA_FEEDBACK_CONTACT_FIELDS: readonly BetaSurveyFieldDef[] = [
  {
    key: "contactEmail",
    label: "Email",
    kind: "email",
    section: "contact",
  },
  {
    key: "contactDiscord",
    label: "Discord",
    kind: "text",
    section: "contact",
  },
  {
    key: "futureBetaContact",
    label: "Would you like to be contacted for future beta tests?",
    kind: "boolean",
    section: "contact",
  },
] as const

/** Auto-attached session metadata (stored in responses + table columns). */
export const BETA_FEEDBACK_SESSION_FIELDS: readonly BetaSurveyFieldDef[] = [
  { key: "trackName", label: "Track name", kind: "text", section: "session" },
  { key: "trackTitle", label: "Track title", kind: "text", section: "session" },
  { key: "sessionId", label: "Session ID", kind: "text", section: "session" },
  { key: "trackDuration", label: "Track duration", kind: "text", section: "session" },
  { key: "masteringStyle", label: "Mastering style", kind: "text", section: "session" },
  { key: "stereoWidth", label: "Stereo width", kind: "text", section: "session" },
  { key: "lowEnd", label: "Low end", kind: "text", section: "session" },
  { key: "masterLufs", label: "Master LUFS", kind: "text", section: "session" },
  { key: "processingTimeMs", label: "Processing time", kind: "text", section: "session" },
  { key: "masterObjectKey", label: "Master object key", kind: "text", section: "session" },
] as const

export const BETA_FEEDBACK_ALL_SCHEMA_FIELDS: readonly BetaSurveyFieldDef[] = [
  ...BETA_FEEDBACK_SURVEY_FIELDS,
  ...BETA_FEEDBACK_CONTACT_FIELDS,
  ...BETA_FEEDBACK_SESSION_FIELDS,
]

/** Keys collected in BetaFeedbackFlow UI (survey + optional contact). */
export const BETA_FEEDBACK_FLOW_FIELD_KEYS: readonly string[] = [
  ...BETA_FEEDBACK_SURVEY_FIELDS.map((f) => f.key),
  ...BETA_FEEDBACK_CONTACT_FIELDS.map((f) => f.key),
]

const KNOWN_KEYS = new Set(BETA_FEEDBACK_ALL_SCHEMA_FIELDS.map((f) => f.key))

export function isKnownBetaSurveyKey(key: string): boolean {
  return KNOWN_KEYS.has(key)
}

export function getBetaSurveyField(key: string): BetaSurveyFieldDef | undefined {
  return BETA_FEEDBACK_ALL_SCHEMA_FIELDS.find((f) => f.key === key)
}

export function getBetaSurveyFieldsByAnalyticsRole(
  role: BetaSurveyAnalyticsRole,
): BetaSurveyFieldDef[] {
  return BETA_FEEDBACK_ALL_SCHEMA_FIELDS.filter((f) => f.analyticsRole === role)
}

/** Keys present in stored JSON but not yet in the schema (forward-compatible). */
export function discoverUnknownSurveyKeys(
  survey: Record<string, unknown>,
): string[] {
  return Object.keys(survey)
    .filter((k) => !isKnownBetaSurveyKey(k))
    .sort()
}

export function humanizeSurveyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/** Default empty payload — keep in sync with BetaFeedbackFlow emptyForm(). */
export function emptyBetaFeedbackPayload(): BetaFeedbackPayload {
  return {
    role: "",
    genre: "",
    comparison: "",
    stoodOut: [],
    soundedOff: [],
    easeRating: 3,
    speedPerception: "",
    releaseReady: "",
    wouldRelease: "",
    useAgainScore: 7,
    recommendScore: 7,
    missing: "",
    oneChange: "",
    worthPaying: "",
    additional: "",
    contactEmail: "",
    contactDiscord: "",
    futureBetaContact: null,
    masterObjectKey: null,
    trackTitle: null,
    sessionId: "",
    trackName: null,
    trackDuration: null,
    masteringStyle: "",
    stereoWidth: 50,
    lowEnd: 50,
    masterLufs: null,
    processingTimeMs: null,
  }
}
