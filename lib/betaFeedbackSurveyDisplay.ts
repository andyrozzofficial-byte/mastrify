import type { AdminFeedbackRow } from "./adminTypes"
import type { BetaFeedbackPayload } from "./betaFeedbackTypes"
import {
  BETA_FEEDBACK_CONTACT_FIELDS,
  BETA_FEEDBACK_SESSION_FIELDS,
  BETA_FEEDBACK_SURVEY_FIELDS,
  discoverUnknownSurveyKeys,
  getBetaSurveyField,
  humanizeSurveyKey,
  type BetaSurveyFieldDef,
  type BetaSurveyFieldKind,
} from "./betaFeedbackSurveySchema"

export type BetaSurveyDisplayEntry = {
  key: string
  label: string
  hint?: string
  kind: BetaSurveyFieldKind
  value: unknown
  formatted: string
  isEmpty: boolean
  tone?: "positive" | "negative" | "neutral"
  section: "survey" | "contact" | "session" | "unknown"
}

export type BetaSurveyDisplaySections = {
  survey: BetaSurveyDisplayEntry[]
  contact: BetaSurveyDisplayEntry[]
  session: BetaSurveyDisplayEntry[]
  unknown: BetaSurveyDisplayEntry[]
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatBoolean(v: boolean | null | undefined): string {
  if (v === true) return "Yes"
  if (v === false) return "No"
  return "—"
}

function formatPrimitive(value: unknown, kind: BetaSurveyFieldKind): string {
  if (value == null) return "—"
  if (kind === "boolean") return formatBoolean(value as boolean | null)
  if (Array.isArray(value)) {
    const items = value.map((x) => String(x).trim()).filter(Boolean)
    return items.length ? items.join(", ") : "—"
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  const s = String(value).trim()
  return s || "—"
}

export function formatSurveyFieldValue(field: BetaSurveyFieldDef, value: unknown): string {
  if (field.key === "trackDuration" && typeof value === "number") {
    return formatDuration(value)
  }
  if (field.key === "processingTimeMs" && typeof value === "number") {
    return `${(value / 1000).toFixed(1)}s`
  }
  if (field.key === "masterLufs" && typeof value === "number") {
    return `${value} LUFS`
  }
  return formatPrimitive(value, field.kind)
}

function isEmptyValue(value: unknown, kind: BetaSurveyFieldKind): boolean {
  if (value == null) return true
  if (kind === "boolean") return value !== true && value !== false
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "number") return !Number.isFinite(value)
  return !String(value).trim()
}

function resolveSessionValue(
  key: string,
  survey: BetaFeedbackPayload,
  row: AdminFeedbackRow,
): unknown {
  switch (key) {
    case "trackName":
      return row.track_name ?? survey.trackName ?? survey.trackTitle
    case "trackTitle":
      return survey.trackTitle ?? row.track_name
    case "sessionId":
      return row.session_id ?? survey.sessionId
    case "trackDuration":
      return row.track_duration ?? survey.trackDuration
    case "masteringStyle":
      return row.mastering_style ?? survey.masteringStyle
    case "stereoWidth":
      return row.stereo_width ?? survey.stereoWidth
    case "lowEnd":
      return row.low_end ?? survey.lowEnd
    case "masterLufs":
      return row.master_lufs ?? survey.masterLufs
    case "processingTimeMs":
      return row.processing_time_ms ?? survey.processingTimeMs
    case "masterObjectKey":
      return survey.masterObjectKey
    default:
      return (survey as Record<string, unknown>)[key]
  }
}

function buildEntry(
  field: BetaSurveyFieldDef,
  value: unknown,
  section: BetaSurveyDisplayEntry["section"],
): BetaSurveyDisplayEntry {
  const formatted = formatSurveyFieldValue(field, value)
  return {
    key: field.key,
    label: field.label,
    hint: field.hint,
    kind: field.kind,
    value,
    formatted,
    isEmpty: isEmptyValue(value, field.kind),
    tone: field.tone,
    section,
  }
}

function buildEntriesFromSchema(
  fields: readonly BetaSurveyFieldDef[],
  survey: BetaFeedbackPayload,
  row: AdminFeedbackRow,
  section: BetaSurveyDisplayEntry["section"],
): BetaSurveyDisplayEntry[] {
  return fields.map((field) => {
    const value =
      section === "session"
        ? resolveSessionValue(field.key, survey, row)
        : (survey as Record<string, unknown>)[field.key]
    return buildEntry(field, value, section)
  })
}

export function buildBetaSurveyDisplaySections(
  row: AdminFeedbackRow,
): BetaSurveyDisplaySections {
  const survey = row.survey as BetaFeedbackPayload & Record<string, unknown>

  const unknown = discoverUnknownSurveyKeys(survey).map((key) => {
    const value = survey[key]
    const field: BetaSurveyFieldDef = {
      key,
      label: humanizeSurveyKey(key),
      kind: Array.isArray(value) ? "checkbox" : typeof value === "number" ? "range" : "textarea",
      section: "survey",
    }
    return buildEntry(field, value, "unknown")
  })

  return {
    survey: buildEntriesFromSchema(BETA_FEEDBACK_SURVEY_FIELDS, survey, row, "survey"),
    contact: buildEntriesFromSchema(BETA_FEEDBACK_CONTACT_FIELDS, survey, row, "contact"),
    session: buildEntriesFromSchema(BETA_FEEDBACK_SESSION_FIELDS, survey, row, "session"),
    unknown,
  }
}

export function getSurveyValue(
  survey: BetaFeedbackPayload,
  key: string,
): unknown {
  return (survey as Record<string, unknown>)[key]
}

export function getNumericSurveyScore(survey: BetaFeedbackPayload, key: string): number | null {
  const v = getSurveyValue(survey, key)
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

export function getSurveyFieldLabel(key: string): string {
  return getBetaSurveyField(key)?.label ?? humanizeSurveyKey(key)
}
