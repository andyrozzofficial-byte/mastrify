"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminWhenVisible } from "../../components/admin/AdminWhenVisible"
import { perfTimeEnd, perfTimeStart } from "../../../lib/perfDebug"
import type { AdminFeedbackAnalytics } from "../../../lib/adminFeedbackAnalytics"
import type { ActionCenterIssue, RankedIssue } from "../../../lib/adminFeedbackActionCenter"
import { feedbackSentiment, FEEDBACK_SENTIMENT_STYLES } from "../../../lib/adminFeedbackSentiment"
import type { AdminFeedbackRow, AdminFeedbackStatus } from "../../../lib/adminTypes"
import { ADMIN_FEEDBACK_STATUSES } from "../../../lib/adminTypes"
import { AdminActionCenter } from "../../components/admin/AdminActionCenter"
import { FeedbackQuickBadges, feedbackHoverPreviewLines } from "../../components/admin/FeedbackQuickBadges"
import { IssuePrioritizationPanel } from "../../components/admin/IssuePrioritizationPanel"
import { FeedbackSurveyDetail } from "../../components/admin/FeedbackSurveyDetail"
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  BarChartCard,
  FunnelChart,
  FeedbackStatusBadge,
  formatAdminDate,
  KpiCard,
  RatingDistributionChart,
  SparklineChart,
} from "../../components/admin/admin-shared"

type FeedbackApiResponse = {
  rows?: AdminFeedbackRow[]
  analytics?: AdminFeedbackAnalytics
  insights?: string[]
  actionCenter?: ActionCenterIssue[]
  issueTiers?: { critical: RankedIssue[]; medium: RankedIssue[]; positive: RankedIssue[] }
  error?: string
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
  const hoverLines = feedbackHoverPreviewLines(row)
  const stageBadge =
    row.feedback_stage === "completed"
      ? "Full survey"
      : row.feedback_stage === "preview"
        ? "Preview pulse"
        : "Analysis pulse"

  return (
    <article
      className={`group relative rounded-2xl border bg-[#ffffff] transition duration-200 ${styles.border} ${styles.glow} ${expanded ? "" : "hover:border-violet-300"}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggle()
          }
        }}
        className="cursor-pointer p-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-slate-900">
                {row.track_name ?? "Untitled track"}
              </h3>
              <FeedbackStatusBadge status={row.status} />
              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-medium uppercase text-violet-800">
                {stageBadge}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {formatAdminDate(row.created_at)}
              {row.feedback_stage === "completed" ? ` · ${row.role}` : ""}
            </p>
            <div className="mt-3">
              <FeedbackQuickBadges row={row} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/admin/feedback/${row.id}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10"
            >
              Detail
            </Link>
            <span className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500">
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-[min(20rem,90vw)] -translate-x-1/2 pt-2 group-hover:block">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-[12px] leading-relaxed text-slate-700 shadow-lg shadow-slate-300/40">
          {hoverLines.map((line) => (
            <p
              key={line}
              className="line-clamp-2 break-words border-b border-slate-100 py-1 last:border-0"
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 px-5 pb-5 pt-2">
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
  const [actionCenter, setActionCenter] = useState<ActionCenterIssue[]>([])
  const [issueTiers, setIssueTiers] = useState<{
    critical: RankedIssue[]
    medium: RankedIssue[]
    positive: RankedIssue[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminFeedbackStatus | "">("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chartsReady, setChartsReady] = useState(false)

  const load = useCallback(async () => {
    perfTimeStart("admin-feedback-load")
    try {
      const res = await fetch("/api/admin/feedback", { cache: "no-store" })
      const json = (await res.json().catch(() => null)) as FeedbackApiResponse | null
      if (!res.ok) {
        setError(json?.error ?? "Could not load feedback")
        return
      }
      setRows(json?.rows ?? [])
      setAnalytics(json?.analytics ?? null)
      setInsights(json?.insights ?? [])
      setActionCenter(json?.actionCenter ?? [])
      setIssueTiers(json?.issueTiers ?? null)
      setError(null)
    } finally {
      perfTimeEnd("admin-feedback-load")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!analytics) {
      setChartsReady(false)
      return
    }
    const enable = () => setChartsReady(true)
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(enable, { timeout: 1500 })
      return () => cancelIdleCallback(id)
    }
    const t = window.setTimeout(enable, 0)
    return () => window.clearTimeout(t)
  }, [analytics])

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
    <div>
      <AdminPageHeader
        title="Feedback"
        subtitle="Scan submissions fast — expand any row for full survey answers without leaving the list."
      />

      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <AdminActionCenter items={actionCenter} />

      {issueTiers ? (
        <IssuePrioritizationPanel
          critical={issueTiers.critical}
          medium={issueTiers.medium}
          positive={issueTiers.positive}
        />
      ) : null}

      {analytics ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {analytics?.stages ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Analysis accuracy"
            value={
              analytics.stages.analysisAccuracyScore != null
                ? `${analytics.stages.analysisAccuracyScore}%`
                : "—"
            }
            hint="“Yes” on analysis pulse"
            accent="sky"
          />
          <KpiCard
            label="Preview satisfaction"
            value={
              analytics.stages.previewSatisfactionScore != null
                ? `${analytics.stages.previewSatisfactionScore}%`
                : "—"
            }
            hint="“Better” vs original"
            accent="emerald"
          />
          <KpiCard
            label="Analysis pulses"
            value={String(analytics.stages.byStage.find((s) => s.stage === "analysis")?.count ?? 0)}
            accent="violet"
          />
          <KpiCard
            label="Preview pulses"
            value={String(analytics.stages.byStage.find((s) => s.stage === "preview")?.count ?? 0)}
            accent="amber"
          />
        </div>
      ) : null}

      {insights.length > 0 ? (
        <AdminCard className="mb-8">
          <h2 className="text-[15px] font-semibold text-slate-900">Insights</h2>
          <p className="mt-1 text-[13px] text-slate-500">Auto-generated from survey patterns (no external AI).</p>
          <ul className="mt-4 space-y-2.5">
            {insights.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[14px] leading-relaxed text-slate-800"
              >
                <span className="text-violet-600" aria-hidden>
                  •
                </span>
                {line}
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {!analytics && !error ? (
        <AdminEmpty message="No analytics data yet" />
      ) : null}

      {analytics && chartsReady ? (
        <AdminWhenVisible>
        <div className="admin-charts-grid mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3">
          <FunnelChart
            steps={(analytics.stages?.dropOff ?? []).map((d) => ({ step: d.step, count: d.count }))}
          />
          <BarChartCard
            title={analytics.chartLabels?.genre ?? "Genre"}
            items={analytics.charts?.genreDistribution ?? []}
          />
          <BarChartCard
            title={analytics.chartLabels?.commonIssues ?? "Issues"}
            items={analytics.charts?.commonIssues ?? []}
          />
          <BarChartCard
            title={analytics.chartLabels?.topPositives ?? "Positives"}
            items={analytics.charts?.topPositives ?? []}
          />
          <RatingDistributionChart
            title={analytics.chartLabels?.useAgainScores ?? "Use again"}
            items={analytics.charts?.ratingDistribution ?? []}
          />
          <RatingDistributionChart
            title={analytics.chartLabels?.recommendScores ?? "Recommend"}
            items={analytics.charts?.recommendRatingDistribution ?? []}
          />
          <SparklineChart
            title="Daily submissions"
            points={(analytics.charts?.dailyTrend ?? []).map((d) => ({ date: d.date, count: d.count }))}
            dataKey="count"
            color="bg-sky-500/80"
          />
          <SparklineChart
            title="Weekly avg. recommend"
            points={(analytics.charts?.weeklyTrend ?? []).map((w) => ({
              week: w.week,
              avgRecommend: w.avgRecommend,
            }))}
            dataKey="avgRecommend"
            color="bg-emerald-500/75"
          />
          <BarChartCard
            title={analytics.chartLabels?.textSnippets ?? "Written answers"}
            items={analytics.charts?.requestedFeatureSnippets ?? []}
            empty="No written survey answers yet"
          />
        </div>
        </AdminWhenVisible>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Track, genre, email, comments…"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdminFeedbackStatus | "")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
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
