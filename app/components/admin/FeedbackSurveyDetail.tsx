"use client"

import type { AdminFeedbackRow, AdminFeedbackStatus } from "../../../lib/adminTypes"
import { feedbackSentiment, FEEDBACK_SENTIMENT_STYLES } from "../../../lib/adminFeedbackSentiment"
import {
  FeedbackStatusBadge,
  FeedbackStatusSelect,
  formatAdminDate,
} from "./admin-shared"

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.09] bg-[#222228] p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function DetailField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-white/42">{label}</dt>
      <dd className={`mt-1 text-[15px] leading-relaxed text-white/88 ${mono ? "font-mono text-[13px]" : ""}`}>
        {value ?? "—"}
      </dd>
    </div>
  )
}

function ScorePill({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100
  const tone =
    score >= 8 ? "text-emerald-300" : score <= 5 ? "text-rose-300" : "text-amber-200/90"
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c22] px-4 py-3">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {score}
        <span className="text-base font-normal text-white/35"> / {max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${score >= 8 ? "bg-emerald-500/80" : score <= 5 ? "bg-rose-500/75" : "bg-violet-500/70"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function TagList({ items, variant }: { items: string[]; variant: "positive" | "negative" | "neutral" }) {
  if (items.length === 0) return <p className="text-sm text-white/45">—</p>
  const cls =
    variant === "positive"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
      : variant === "negative"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
        : "border-white/[0.1] bg-[#2a2a30] text-white/75"
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={`rounded-lg border px-2.5 py-1 text-[13px] ${cls}`}>
          {item}
        </li>
      ))}
    </ul>
  )
}

function TextBlock({
  label,
  text,
  variant = "neutral",
}: {
  label: string
  text: string
  variant?: "positive" | "negative" | "neutral"
}) {
  if (!text?.trim()) return null
  const box =
    variant === "positive"
      ? "border-emerald-500/20 bg-emerald-500/[0.06]"
      : variant === "negative"
        ? "border-rose-500/25 bg-rose-500/[0.06]"
        : "border-white/[0.08] bg-[#1c1c22]"
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">{label}</p>
      <p className={`mt-2 whitespace-pre-wrap rounded-xl border px-4 py-3 text-[14px] leading-relaxed text-white/82 ${box}`}>
        {text.trim()}
      </p>
    </div>
  )
}

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
  const s = row.survey
  const sentiment = feedbackSentiment(row)
  const styles = FEEDBACK_SENTIMENT_STYLES[sentiment]
  const soundedIssues = (s.soundedOff ?? []).filter((x) => x !== "No, it sounded good")
  const soundedGoodOnly =
    (s.soundedOff ?? []).includes("No, it sounded good") && soundedIssues.length === 0

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border bg-[#222228] p-6 ${styles.border} ${styles.glow}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Submission</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{row.track_name ?? "Untitled track"}</h2>
            <p className="mt-1 text-sm text-white/55">
              {row.genre} · {row.role} · {formatAdminDate(row.created_at)}
            </p>
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

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Artist / role" value={row.role} />
          <DetailField label="Email" value={row.contact_email} />
          <DetailField label="Discord" value={row.contact_discord} />
          <DetailField label="Session ID" value={row.session_id} mono />
          <DetailField label="Master style" value={row.mastering_style} />
          <DetailField label="LUFS" value={row.master_lufs != null ? `${row.master_lufs} LUFS` : null} />
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ScorePill label="Use again (overall)" score={row.use_again_score} />
        <ScorePill label="Would recommend Mastrify" score={row.recommend_score} />
        <ScorePill label="Ease of experience" score={row.ease_rating} max={5} />
      </div>

      <DetailSection title="What sounded good">
        <TagList items={s.stoodOut ?? []} variant="positive" />
      </DetailSection>

      <DetailSection title="What sounded bad / issues">
        {soundedGoodOnly ? (
          <p className="text-sm text-emerald-200/85">No issues reported — user said it sounded good.</p>
        ) : (
          <TagList items={soundedIssues.length ? soundedIssues : s.soundedOff ?? []} variant="negative" />
        )}
      </DetailSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Survey answers">
          <dl className="grid gap-4">
            <DetailField label="Compared to original mix" value={s.comparison} />
            <DetailField label="Processing speed" value={s.speedPerception} />
            <DetailField label="Release-ready" value={s.releaseReady} />
            <DetailField label="Would release with Mastrify" value={s.wouldRelease} />
            <DetailField
              label="Stereo width / low end"
              value={
                row.stereo_width != null && row.low_end != null
                  ? `${row.stereo_width} / ${row.low_end}`
                  : null
              }
            />
            <DetailField
              label="Processing time"
              value={
                row.processing_time_ms != null
                  ? `${(row.processing_time_ms / 1000).toFixed(1)}s`
                  : null
              }
            />
          </dl>
        </DetailSection>

        <DetailSection title="Written feedback">
          <div className="space-y-4">
            <TextBlock label="Missing features" text={s.missing} variant="neutral" />
            <TextBlock label="One change immediately" text={s.oneChange} variant="negative" />
            <TextBlock label="Worth paying for" text={s.worthPaying} variant="positive" />
            <TextBlock label="Additional comments" text={s.additional} variant="neutral" />
          </div>
        </DetailSection>
      </div>

      {showAdminControls && onStatusChange && onNotesBlur ? (
        <DetailSection title="Admin">
          <div className="grid gap-4 sm:grid-cols-2">
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
        </DetailSection>
      ) : null}
    </div>
  )
}
