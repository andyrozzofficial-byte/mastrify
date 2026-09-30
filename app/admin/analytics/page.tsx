"use client"

import { useEffect, useState } from "react"
import type { AdminBusinessAnalytics, PeriodMetrics } from "../../../lib/adminTypes"
import {
  ANALYTICS_PERIOD_LABELS,
  ANALYTICS_PERIODS,
  formatComparisonHint,
  type AnalyticsPeriod,
} from "../../../lib/adminAnalyticsPeriods"
import { perfTimeEnd, perfTimeStart } from "../../../lib/perfDebug"
import { AdminWhenVisible } from "../../components/admin/AdminWhenVisible"
import {
  AdminCard,
  AdminPageHeader,
  BarChartCard,
  FunnelChart,
  KpiCard,
  SparklineChart,
} from "../../components/admin/admin-shared"

function formatUsd(n: number): string {
  if (n >= 100) return `$${n.toFixed(0)}`
  return `$${n.toFixed(2)}`
}

type CountMetricKey = "revenue" | "masters" | "uploads" | "visitors" | "paidExports" | "failedJobs"

function overviewHint(
  key: CountMetricKey,
  overview: PeriodMetrics,
  comparison: PeriodMetrics | null,
  comparisonLabel: string | null,
  formatValue: (n: number) => string = String,
): string | undefined {
  if (!comparison || !comparisonLabel) return undefined
  return formatComparisonHint(overview[key], comparison[key], comparisonLabel, formatValue)
}

function formatRate(rate: number | null | undefined): string {
  return rate != null ? `${rate}%` : "—"
}

function AnalyticsFunnel({
  steps,
  comparable,
  note,
}: {
  steps: { step: string; count: number }[]
  comparable: boolean
  note: string | null
}) {
  if (comparable) {
    return <FunnelChart steps={steps} />
  }

  return (
    <AdminCard>
      <h3 className="text-[15px] font-semibold text-white">Conversion funnel</h3>
      {note ? <p className="mt-2 text-[12px] leading-relaxed text-amber-200/75">{note}</p> : null}
      <ul className="mt-5 space-y-3">
        {steps.map((item) => (
          <li
            key={item.step}
            className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 text-[13px]"
          >
            <span className="text-white/65">{item.step}</span>
            <span className="tabular-nums font-medium text-white">{item.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-white/40">
        Conversion rates are hidden because these steps cannot be treated as one sequential funnel.
      </p>
    </AdminCard>
  )
}

function PeriodTabs({
  value,
  onChange,
}: {
  value: AnalyticsPeriod
  onChange: (p: AnalyticsPeriod) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ANALYTICS_PERIODS.map((p) => {
        const active = p === value
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
              active
                ? "bg-violet-600/25 text-violet-100 ring-1 ring-violet-400/40"
                : "bg-white/[0.04] text-white/60 ring-1 ring-white/[0.08] hover:bg-white/[0.07] hover:text-white/80"
            }`}
          >
            {ANALYTICS_PERIOD_LABELS[p]}
          </button>
        )
      })}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d")
  const [data, setData] = useState<AdminBusinessAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function handlePeriodChange(next: AnalyticsPeriod) {
    if (next === period) return
    setLoading(true)
    setError(null)
    setPeriod(next)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      perfTimeStart("admin-analytics-load")
      const res = await fetch(`/api/admin/analytics?period=${encodeURIComponent(period)}`, {
        cache: "no-store",
      })
      const json = await res.json().catch(() => null)
      perfTimeEnd("admin-analytics-load")
      if (cancelled) return
      if (json?.error) {
        setError(json.error)
        setData(null)
      } else {
        setData(json as AdminBusinessAnalytics)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [period])

  if (loading && !data) {
    return <p className="text-sm text-white/50">Loading analytics…</p>
  }

  if (error && !data) {
    return <p className="text-sm text-rose-300/90">{error}</p>
  }

  if (!data) return <p className="text-sm text-white/50">No analytics data.</p>

  const periodLabel = ANALYTICS_PERIOD_LABELS[period]
  const synced = !loading && data.period === period
  const overview = synced ? data.overview : null
  const comparison = synced ? data.comparison : null
  const comparisonLabel = synced ? data.comparisonLabel : null
  const mastering = synced ? data.mastering : null
  const traffic = synced ? data.traffic : null
  const rev = synced ? data.revenue : null
  const timeSeries = synced ? data.timeSeries : null
  const genreDistribution = synced ? data.genreDistribution : []
  const funnel = synced ? data.funnel : []
  const funnelComparable = synced ? data.funnelComparable : true
  const funnelNote = synced ? data.funnelNote : null

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="Business and mastering metrics — revenue, usage, traffic, and conversion for the selected period."
        actions={<PeriodTabs value={period} onChange={handlePeriodChange} />}
      />

      {error ? <p className="mb-4 text-sm text-amber-300/90">{error}</p> : null}
      {loading ? (
        <p className="mb-4 text-sm text-white/45" aria-live="polite">
          Refreshing…
        </p>
      ) : null}

      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">
        Overview — {periodLabel}
      </h2>
      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${loading ? "opacity-60" : ""}`}
      >
        <KpiCard
          label="Revenue"
          value={overview ? formatUsd(overview.revenue) : "—"}
          hint={
            overview
              ? overviewHint("revenue", overview, comparison, comparisonLabel, formatUsd)
              : undefined
          }
          accent="emerald"
        />
        <KpiCard
          label="Masters"
          value={overview ? String(overview.masters) : "—"}
          hint={
            overview ? overviewHint("masters", overview, comparison, comparisonLabel) : undefined
          }
          accent="violet"
        />
        <KpiCard
          label="Uploads"
          value={overview ? String(overview.uploads) : "—"}
          hint={
            overview ? overviewHint("uploads", overview, comparison, comparisonLabel) : undefined
          }
          accent="sky"
        />
        <KpiCard
          label="Visitors"
          value={overview ? String(overview.visitors) : "—"}
          hint={
            overview ? overviewHint("visitors", overview, comparison, comparisonLabel) : undefined
          }
          accent="sky"
        />
        <KpiCard
          label="Paid exports"
          value={overview ? String(overview.paidExports) : "—"}
          hint={
            overview
              ? overviewHint("paidExports", overview, comparison, comparisonLabel)
              : undefined
          }
          accent="emerald"
        />
        <KpiCard
          label="Failed jobs"
          value={overview ? String(overview.failedJobs) : "—"}
          hint={
            overview
              ? overviewHint("failedJobs", overview, comparison, comparisonLabel)
              : undefined
          }
          accent="amber"
        />
      </div>

      <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
        <KpiCard
          label="Upload → master"
          value={overview ? formatRate(overview.uploadToMasterRate) : "—"}
          hint={
            overview && !funnelComparable
              ? "N/A — upload and master data are not from the same session population"
              : undefined
          }
          accent="violet"
        />
        <KpiCard
          label="Master → paid export"
          value={overview ? formatRate(overview.masterToPaidRate) : "—"}
          accent="emerald"
        />
      </div>

      <h2 className="mb-4 mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">
        Revenue
      </h2>
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-5 ${loading ? "opacity-60" : ""}`}>
        <KpiCard label="Today" value={rev ? formatUsd(rev.today) : "—"} accent="emerald" />
        <KpiCard label="Yesterday" value={rev ? formatUsd(rev.yesterday) : "—"} accent="emerald" />
        <KpiCard label="This month" value={rev ? formatUsd(rev.thisMonth) : "—"} accent="emerald" />
        <KpiCard label="Last month" value={rev ? formatUsd(rev.lastMonth) : "—"} accent="emerald" />
        <KpiCard label="All time" value={rev ? formatUsd(rev.allTime) : "—"} accent="emerald" />
      </div>

      <AdminWhenVisible>
        <div className={`mt-6 grid gap-6 lg:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
          <SparklineChart
            title="Revenue over time"
            points={timeSeries?.revenue ?? []}
            dataKey="revenue"
            color="bg-emerald-500/75"
            emptyLabel="No paid export revenue in this period yet"
          />
          <SparklineChart
            title="Masters over time"
            points={timeSeries?.masters ?? []}
            dataKey="masters"
            color="bg-violet-500/75"
          />
        </div>
        <div className={`mt-6 grid gap-6 lg:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
          <SparklineChart
            title="Uploads over time"
            points={timeSeries?.uploads ?? []}
            dataKey="uploads"
            color="bg-sky-500/75"
          />
          <SparklineChart
            title="Visitors over time"
            points={timeSeries?.visitors ?? []}
            dataKey="visitors"
            color="bg-sky-500/75"
            emptyLabel="No visitor data in this period yet"
          />
        </div>
      </AdminWhenVisible>

      <h2 className="mb-4 mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">
        Mastering — {periodLabel}
      </h2>
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
        <KpiCard
          label="Completed masters"
          value={mastering ? String(mastering.completed) : "—"}
          accent="violet"
        />
        <KpiCard
          label="Failed masters"
          value={mastering ? String(mastering.failed) : "—"}
          accent="amber"
        />
        <KpiCard
          label="Avg processing"
          value={
            mastering?.avgProcessingMs != null
              ? `${(mastering.avgProcessingMs / 1000).toFixed(1)}s`
              : "—"
          }
          accent="sky"
        />
        <KpiCard
          label="Avg LUFS"
          value={mastering?.avgLufs != null ? String(mastering.avgLufs) : "—"}
          accent="violet"
        />
        <KpiCard
          label="Avg track duration"
          value={
            mastering?.avgTrackDurationSec != null
              ? `${Math.round(mastering.avgTrackDurationSec)}s`
              : "—"
          }
          hint={
            mastering?.trackDurationSource === "feedback"
              ? "From beta_master_feedback.track_duration"
              : undefined
          }
          accent="neutral"
        />
        <KpiCard
          label="Master → paid"
          value={mastering ? formatRate(mastering.masterToPaidRate) : "—"}
          accent="emerald"
        />
        <KpiCard
          label="Top style"
          value={mastering?.topStyle?.style ?? "—"}
          hint={mastering?.topStyle ? `${mastering.topStyle.count} masters` : undefined}
          accent="neutral"
        />
      </div>

      <AdminWhenVisible>
        <div className={`mt-6 grid gap-6 lg:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
          <BarChartCard
            title="Mastering styles"
            items={mastering?.styleDistribution ?? []}
            empty="No mastering style data in this period"
          />
          <BarChartCard
            title="Genre distribution"
            items={genreDistribution}
            empty="No genre feedback in this period"
          />
        </div>
        <div className={`mt-6 ${loading ? "opacity-60" : ""}`}>
          <AnalyticsFunnel
            steps={funnel}
            comparable={funnelComparable}
            note={funnelNote}
          />
        </div>
      </AdminWhenVisible>

      <h2 className="mb-4 mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">
        Traffic — {periodLabel}
      </h2>

      {synced && traffic ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Visitors" value={String(traffic.visitors)} accent="sky" />
            <KpiCard label="Page views" value={String(traffic.pageViews)} accent="violet" />
            <KpiCard label="Sessions" value={String(traffic.sessions)} accent="sky" />
          </div>

          <AdminWhenVisible>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SparklineChart
                title="Daily visitors"
                points={traffic.dailyTraffic}
                dataKey="visitors"
                color="bg-sky-500/75"
              />
              <SparklineChart
                title="Daily page views"
                points={traffic.dailyTraffic}
                dataKey="pageViews"
                color="bg-violet-500/75"
              />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <BarChartCard title="Top pages" items={traffic.topPages} empty="No page data yet" />
              <BarChartCard
                title="Traffic sources"
                items={traffic.topReferrers}
                empty="No referrer data yet"
              />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <BarChartCard title="Device type" items={traffic.devices} empty="No device data yet" />
              <BarChartCard title="Country" items={traffic.countries} empty="No country data yet" />
            </div>
          </AdminWhenVisible>
        </>
      ) : synced ? (
        <p className="text-sm text-white/50">
          No website traffic in this period — pageviews appear once visitors browse the public site
          and the admin_site_page_views migration is applied.
        </p>
      ) : (
        <p className="text-sm text-white/45">Refreshing traffic metrics…</p>
      )}
    </div>
  )
}
