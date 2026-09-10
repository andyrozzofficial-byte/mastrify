import type { AdminFeedbackRow } from "./adminTypes"
import type { BetaSurveyDisplaySections } from "./betaFeedbackSurveyDisplay"
import {
  BETA_FEEDBACK_CONTACT_FIELDS,
  BETA_FEEDBACK_FLOW_FIELD_KEYS,
  BETA_FEEDBACK_SESSION_FIELDS,
  BETA_FEEDBACK_SURVEY_FIELDS,
} from "./betaFeedbackSurveySchema"

const LOG_PREFIX = "[beta-feedback-admin]"

export type BetaFeedbackDetailCoverageResult = {
  ok: boolean
  expectedFlowKeys: string[]
  renderedDetailKeys: string[]
  missingFromDetail: { key: string; label: string; section: string }[]
  extraInDetail: string[]
}

/** Keys rendered by FeedbackSurveyDetail from display sections. */
export function collectRenderedDetailKeys(sections: BetaSurveyDisplaySections): string[] {
  return [
    ...sections.survey.map((e) => e.key),
    ...sections.contact.map((e) => e.key),
    ...sections.session.map((e) => e.key),
    ...sections.unknown.map((e) => e.key),
  ]
}

function fieldMeta(key: string): { label: string; section: string } {
  const field =
    BETA_FEEDBACK_SURVEY_FIELDS.find((f) => f.key === key) ??
    BETA_FEEDBACK_CONTACT_FIELDS.find((f) => f.key === key) ??
    BETA_FEEDBACK_SESSION_FIELDS.find((f) => f.key === key)
  return {
    label: field?.label ?? key,
    section: field?.section ?? "unknown",
  }
}

/**
 * Ensures every BetaFeedbackFlow field has a matching admin detail renderer entry.
 * Logs to console when coverage is incomplete.
 */
export function validateBetaFeedbackAdminDetailCoverage(
  sections: BetaSurveyDisplaySections,
  opts?: { submissionId?: string; log?: boolean },
): BetaFeedbackDetailCoverageResult {
  const renderedSet = new Set(collectRenderedDetailKeys(sections))
  const renderedDetailKeys = [...renderedSet]

  const missingFromDetail = BETA_FEEDBACK_FLOW_FIELD_KEYS.filter((key) => !renderedSet.has(key)).map(
    (key) => ({
      key,
      ...fieldMeta(key),
    }),
  )

  const expectedSet = new Set(BETA_FEEDBACK_FLOW_FIELD_KEYS)
  const extraInDetail = renderedDetailKeys.filter((key) => !expectedSet.has(key))

  const result: BetaFeedbackDetailCoverageResult = {
    ok: missingFromDetail.length === 0,
    expectedFlowKeys: [...BETA_FEEDBACK_FLOW_FIELD_KEYS],
    renderedDetailKeys,
    missingFromDetail,
    extraInDetail,
  }

  const shouldLog = opts?.log !== false
  if (shouldLog && !result.ok) {
    console.warn(LOG_PREFIX, "BetaFeedbackFlow fields missing from FeedbackSurveyDetail", {
      submissionId: opts?.submissionId,
      missingFromDetail: result.missingFromDetail,
      expectedCount: result.expectedFlowKeys.length,
      renderedCount: result.renderedDetailKeys.length,
    })
  }

  if (shouldLog && process.env.NODE_ENV === "development" && result.ok) {
    console.debug(LOG_PREFIX, "Survey field coverage OK", {
      submissionId: opts?.submissionId,
      flowFields: result.expectedFlowKeys.length,
      renderedFields: result.renderedDetailKeys.length,
    })
  }

  return result
}

/** Full stored payload for admin debugging (table row + responses JSON). */
export function buildRawFeedbackSubmission(row: AdminFeedbackRow): Record<string, unknown> {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: row.status,
    admin_notes: row.admin_notes,
    session_id: row.session_id,
    track_name: row.track_name,
    track_duration: row.track_duration,
    mastering_style: row.mastering_style,
    contact_email: row.contact_email,
    contact_discord: row.contact_discord,
    stereo_width: row.stereo_width,
    low_end: row.low_end,
    master_lufs: row.master_lufs,
    processing_time_ms: row.processing_time_ms,
    responses: row.survey,
  }
}
