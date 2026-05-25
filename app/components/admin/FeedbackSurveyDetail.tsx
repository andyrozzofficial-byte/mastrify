"use client"

import { useEffect, useMemo } from "react"
import type { AdminFeedbackRow, AdminFeedbackStatus } from "../../../lib/adminTypes"
import { buildBetaSurveyDisplaySections } from "../../../lib/betaFeedbackSurveyDisplay"
import { feedbackSentiment, FEEDBACK_SENTIMENT_STYLES } from "../../../lib/adminFeedbackSentiment"
import { validateBetaFeedbackAdminDetailCoverage } from "../../../lib/betaFeedbackSurveyValidation"
import { BetaSurveyFieldDisplay } from "./BetaSurveyFieldDisplay"
import { FeedbackRawSubmissionPanel } from "./FeedbackRawSubmissionPanel"
import {
  FeedbackStatusBadge,
  FeedbackStatusSelect,
  formatAdminDate,
} from "./admin-shared"

type Props = {
  row: AdminFeedbackRow
  saving?: boolean
  onStatusChange?: (status: AdminFeedbackStatus) => void
  onNotesBlur?: (notes: string | null) => void
  showAdminControls?: boolean
}

export function FeedbackSurveyDetail({
  row,
  saving,
  onStatusChange,
  onNotesBlur,
  showAdminControls = true,
}: Props) {
  const sections = useMemo(() => buildBetaSurveyDisplaySections(row), [row])
  const coverage = useMemo(
    () => validateBetaFeedbackAdminDetailCoverage(sections, { submissionId: row.id, log: false }),
    [sections, row.id],
  )

  useEffect(() => {
    validateBetaFeedbackAdminDetailCoverage(sections, { submissionId: row.id, log: true })
  }, [sections, row.id])

  const sentiment = feedbackSentiment(row)
  const styles = FEEDBACK_SENTIMENT_STYLES[sentiment]
  const trackEntry = sections.session.find((e) => e.key === "trackName")

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border bg-[#222228] p-6 ${styles.border} ${styles.glow}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Submission</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {trackEntry && !trackEntry.isEmpty ? trackEntry.formatted : "Untitled track"}
            </h2>
            <p className="mt-1 text-sm text-white/55">{formatAdminDate(row.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${styles.badge}`}
            >
              {sentiment}
            </span>
            <FeedbackStatusBadge status={row.status} />
          </div>
        </div>
      </div>

      {!coverage.ok ? (
        <div
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100/90"
          role="alert"
        >
          <p className="font-semibold">Survey coverage warning</p>
          <p className="mt-1 text-amber-100/75">
            {coverage.missingFromDetail.length} BetaFeedbackFlow field
            {coverage.missingFromDetail.length === 1 ? "" : "s"} not rendered in this detail view. Check the
            browser console ({`[beta-feedback-admin]`}).
          </p>
          <ul className="mt-2 list-inside list-disc font-mono text-[11px] text-amber-200/80">
            {coverage.missingFromDetail.map((m) => (
              <li key={m.key}>
                {m.key} — {m.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Beta survey responses
        </h3>
        <div className="space-y-3">
          {sections.survey.map((entry) => (
            <BetaSurveyFieldDisplay key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Optional contact
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.contact.map((entry) => (
            <BetaSurveyFieldDisplay key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Session context
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.session.map((entry) => (
            <BetaSurveyFieldDisplay key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      {sections.unknown.length > 0 ? (
        <section>
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-amber-200/70">
            Additional survey fields
          </h3>
          <p className="mb-3 text-[13px] text-white/45">
            Fields present in the submission but not yet defined in the beta survey schema.
          </p>
          <div className="space-y-3">
            {sections.unknown.map((entry) => (
              <BetaSurveyFieldDisplay key={entry.key} entry={entry} />
            ))}
          </div>
        </section>
      ) : null}

      <FeedbackRawSubmissionPanel row={row} />

      {showAdminControls && onStatusChange && onNotesBlur ? (
        <section className="rounded-2xl border border-white/[0.09] bg-[#222228] p-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">Admin</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/42">Status</p>
              <FeedbackStatusSelect
                value={row.status}
                disabled={saving}
                onChange={onStatusChange}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-white/42">Admin notes</p>
              <textarea
                key={row.id + (row.admin_notes ?? "")}
                defaultValue={row.admin_notes ?? ""}
                rows={4}
                className="mt-1 w-full rounded-xl border border-white/[0.1] bg-[#1c1c22] px-3 py-2.5 text-sm text-white"
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v !== (row.admin_notes ?? "")) onNotesBlur(v || null)
                }}
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
