"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { AdminFeedbackAnalytics } from "../../../lib/adminFeedbackAnalytics"
import { getBetaSurveyField } from "../../../lib/betaFeedbackSurveySchema"
import { feedbackSentiment, FEEDBACK_SENTIMENT_STYLES } from "../../../lib/adminFeedbackSentiment"
import type { AdminFeedbackRow, AdminFeedbackStatus } from "../../../lib/adminTypes"
import { ADMIN_FEEDBACK_STATUSES } from "../../../lib/adminTypes"
import { FeedbackSurveyDetail } from "../../components/admin/FeedbackSurveyDetail"
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  BarChartCard,
  FeedbackStatusBadge,
  formatAdminDate,
  KpiCard,
  SparklineChart,
} from "../../components/admin/admin-shared"

type FeedbackApiResponse = {
  rows?: AdminFeedbackRow[]
  analytics?: AdminFeedbackAnalytics
  insights?: string[]
  error?: string
}

function RatingDistributionChart({
  title,
  items,
}: {
  title: string
  items: { label: string; count: number }[]
}) {
  const max = Math.max(1, ...items.map((i) => i.count))
  const hasData = items.some((i) => i.count > 0)
  return (
    <AdminCard className="!bg-[#222228]">
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      {!hasData ? (
        <p className="mt-3 text-sm text-white/45">No ratings yet</p>
      ) : (
        <div className="mt-5 flex h-32 items-end gap-1">
          {items.map((item) => (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full max-w-[18px] rounded-t bg-violet-500/75 transition-all"
                style={{ height: `${Math.max(6, (item.count / max) * 100)}%` }}
                title={`${item.label}: ${item.count}`}
              />
              <span className="text-[9px] tabular-nums text-white/38">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  )
}

function FeedbackListCard({
  row,
  expanded,
  onToggle,
}: {
  row: AdminFeedbackRow
  expanded: boolean
  onToggle: () => void
}) {
  const sentiment = feedbackSentiment(row)
  const styles = FEEDBACK_SENTIMENT_STYLES[sentiment]
  const preview = row.survey.additional?.trim() || row.survey.missing?.trim() || row.survey.oneChange?.trim()

  return (
    <article
      className={`rounded-2xl border bg-[#222228] transition duration-200 ${styles.border} ${expanded ? "p-0" : "hover:border-white/[0.14]"}`}
    >
      <div className="flex w-full flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`/admin/feedback/${row.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-white transition hover:text-violet-200">
              {row.track_name ?? "Untitled track"}
            </h3>
            <FeedbackStatusBadge status={row.status} />
          </div>
          <p className="mt-1 text-sm text-white/55">
            {row.genre} · {row.role} · {formatAdminDate(row.created_at)}
          </p>
          {preview && !expanded ? (
            <p className="mt-2 line-clamp-2 text-[13px] text-white/50">{preview}</p>
          ) : null}
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/admin/feedback/${row.id}`}
            className="text-right"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/40 line-clamp-2 max-w-[8rem]">
              {getBetaSurveyField("recommendScore")?.label.replace(/^\d+\.\s*/, "") ?? "Recommend"}
            </p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                row.recommend_score >= 8
                  ? "text-emerald-300"
                  : row.recommend_score <= 5
                    ? "text-rose-300"
                    : "text-white"
              }`}
            >
              {row.recommend_score}/10
            </p>
          </Link>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-white/[0.1] px-2.5 py-2 text-xs text-white/50 transition hover:bg-white/[0.04] hover:text-white/80"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse preview" : "Expand preview"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-white/[0.08] px-5 pb-5 pt-2">
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href={`/admin/feedback/${row.id}`}
              className="rounded-lg bg-violet-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
            >
              Open full detail →
            </Link>
          </div>
          <FeedbackSurveyDetail row={row} showAdminControls={false} />
        </div>
      ) : null}
    </article>
  )
}

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<AdminFeedbackRow[]>([])
  const [analytics, setAnalytics] = useState<AdminFeedbackAnalytics | null>(null)
  const [insights, setInsights] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminFeedbackStatus | "">("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/feedback", { cache: "no-store" })
    const json = (await res.json().catch(() => null)) as FeedbackApiResponse | null
    if (!res.ok) {
      setError(json?.error ?? "Could not load feedback")
      return
    }
    setRows(json?.rows ?? [])
    setAnalytics(json?.analytics ?? null)
    setInsights(json?.insights ?? [])
    setError(null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (!q) return true
      const surveyBits = Object.values(r.survey).flatMap((v) =>
        Array.isArray(v) ? v : typeof v === "string" || typeof v === "number" ? [String(v)] : [],
      )
      const hay = [
        r.track_name,
        r.session_id,
        r.contact_email,
        r.mastering_style,
        ...surveyBits,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter])

  return (
    <div className="text-white/90">
      <AdminPageHeader
        title="Feedback"
        subtitle="Full beta survey responses, product analytics, and actionable insights."
      />

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {analytics ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total submissions"
            value={String(analytics.summary.totalSubmissions)}
            accent="violet"
          />
          <KpiCard
            label="Avg. recommend score"
            value={
              analytics.summary.avgRecommendScore != null
                ? `${analytics.summary.avgRecommendScore}/10`
                : "—"
            }
            hint={analytics.chartLabels.recommendScores}
            accent="sky"
          />
          <KpiCard
            label="Avg. use-again score"
            value={
              analytics.summary.avgUseAgainScore != null
                ? `${analytics.summary.avgUseAgainScore}/10`
                : "—"
            }
            hint={analytics.chartLabels.useAgainScores}
            accent="emerald"
          />
          <KpiCard
            label="High recommendation"
            value={
              analytics.summary.recommendHighPercent != null
                ? `${analytics.summary.recommendHighPercent}%`
                : "—"
            }
            hint={`Scored 7–10 · ${analytics.chartLabels.recommendScores}`}
            accent="amber"
          />
        </div>
      ) : null}

      {insights.length > 0 ? (
        <AdminCard className="mb-8 !bg-[#25252c]">
          <h2 className="text-[15px] font-semibold text-white">Insights</h2>
          <p className="mt-1 text-[13px] text-white/48">Auto-generated from survey patterns (no external AI).</p>
          <ul className="mt-4 space-y-2.5">
            {insights.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 rounded-xl border border-violet-500/15 bg-violet-500/[0.06] px-4 py-3 text-[14px] leading-relaxed text-white/82"
              >
                <span className="text-violet-300/80" aria-hidden>
                  •
                </span>
                {line}
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {analytics ? (
        <div className="mb-10 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <BarChartCard title={analytics.chartLabels.genre} items={analytics.charts.genreDistribution} />
          <BarChartCard title={analytics.chartLabels.commonIssues} items={analytics.charts.commonIssues} />
          <BarChartCard title={analytics.chartLabels.topPositives} items={analytics.charts.topPositives} />
          <RatingDistributionChart
            title={analytics.chartLabels.useAgainScores}
            items={analytics.charts.ratingDistribution}
          />
          <RatingDistributionChart
            title={analytics.chartLabels.recommendScores}
            items={analytics.charts.recommendRatingDistribution}
          />
          <SparklineChart
            title="Daily submissions"
            points={analytics.charts.dailyTrend.map((d) => ({ date: d.date, count: d.count }))}
            dataKey="count"
            color="bg-sky-500/80"
          />
          <SparklineChart
            title="Weekly avg. recommend"
            points={analytics.charts.weeklyTrend.map((w) => ({
              week: w.week,
              avgRecommend: w.avgRecommend,
            }))}
            dataKey="avgRecommend"
            color="bg-emerald-500/75"
          />
          <BarChartCard
            title={analytics.chartLabels.textSnippets}
            items={analytics.charts.requestedFeatureSnippets}
            empty="No written survey answers yet"
          />
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Track, genre, email, comments…"
          className="!bg-[#222228]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdminFeedbackStatus | "")}
          className="rounded-xl border border-white/[0.1] bg-[#222228] px-3 py-2.5 text-sm text-white"
        >
          <option value="">All statuses</option>
          {ADMIN_FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty message="No feedback matches your filters." />
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => (
            <FeedbackListCard
              key={row.id}
              row={row}
              expanded={expandedId === row.id}
              onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
