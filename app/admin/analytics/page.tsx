"use client"

import { useEffect, useState } from "react"
import type { AdminAnalyticsExtended } from "../../../lib/adminTypes"
import { perfTimeEnd, perfTimeStart } from "../../../lib/perfDebug"
import { AdminWhenVisible } from "../../components/admin/AdminWhenVisible"
import {
  AdminPageHeader,
  BarChartCard,
  FunnelChart,
  KpiCard,
  SparklineChart,
} from "../../components/admin/admin-shared"

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsExtended | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      perfTimeStart("admin-analytics-load")
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      perfTimeEnd("admin-analytics-load")
      if (!res.ok) {
        setError(json?.error ?? "Could not load analytics")
        return
      }
      setData(json as AdminAnalyticsExtended)
    })()
  }, [])

  if (error) return <p className="text-sm text-rose-300/90">{error}</p>
  if (!data) return <p className="text-sm text-white/50">Loading analytics…</p>

  const funnel = data.funnel ?? []
  const dailyTrend = data.dailyTrend ?? []
  const weeklyTrend = data.weeklyTrend ?? []
  const genreDistribution = data.genreDistribution ?? []
  const recommendOverTime = data.recommendOverTime ?? []

  const styleItems = data.topStyle
    ? [{ label: data.topStyle.style, count: data.topStyle.count }]
    : []

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="Website traffic, funnel performance, loudness, genres, styles, and processing trends."
      />

      {data.siteTraffic ? (
        <>
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">
            Website traffic
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Visitors today"
              value={String(data.siteTraffic.visitorsToday)}
              hint={`${data.siteTraffic.pageViewsToday} page views · ${data.siteTraffic.sessionsToday} sessions`}
              accent="sky"
            />
            <KpiCard
              label="Visitors (7d)"
              value={String(data.siteTraffic.visitors7d)}
              accent="violet"
            />
            <KpiCard
              label="Visitors (30d)"
              value={String(data.siteTraffic.visitors30d)}
              hint={`${data.siteTraffic.newVisitors30d} new · ${data.siteTraffic.returningVisitors30d} returning`}
              accent="emerald"
            />
            <KpiCard
              label="Visitor → upload"
              value={
                data.siteTraffic.conversions.visitorToUploadRate != null
                  ? `${data.siteTraffic.conversions.visitorToUploadRate}%`
                  : "—"
              }
              hint={`${data.siteTraffic.conversions.uploads30d} uploads / ${data.siteTraffic.conversions.visitors30d} visitors (30d)`}
              accent="amber"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Upload → master"
              value={
                data.siteTraffic.conversions.uploadToMasterRate != null
                  ? `${data.siteTraffic.conversions.uploadToMasterRate}%`
                  : "—"
              }
              hint={`${data.siteTraffic.conversions.masters30d} masters / ${data.siteTraffic.conversions.uploads30d} uploads (30d)`}
              accent="violet"
            />
            <KpiCard
              label="Master → paid export"
              value={
                data.siteTraffic.conversions.masterToPaidExportRate != null
                  ? `${data.siteTraffic.conversions.masterToPaidExportRate}%`
                  : "—"
              }
              hint={`${data.siteTraffic.conversions.paidExports30d} paid / ${data.siteTraffic.conversions.masters30d} masters (30d)`}
              accent="emerald"
            />
          </div>

          <AdminWhenVisible>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SparklineChart
                title="Daily traffic — visitors"
                points={data.siteTraffic.dailyTraffic}
                dataKey="visitors"
                color="bg-sky-500/75"
              />
              <SparklineChart
                title="Daily traffic — page views"
                points={data.siteTraffic.dailyTraffic}
                dataKey="pageViews"
                color="bg-violet-500/75"
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <BarChartCard title="Top pages" items={data.siteTraffic.topPages} empty="No page data yet" />
              <BarChartCard
                title="Traffic sources"
                items={data.siteTraffic.topReferrers}
                empty="No referrer data yet"
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <BarChartCard title="Device type" items={data.siteTraffic.devices} empty="No device data yet" />
              <BarChartCard title="Country" items={data.siteTraffic.countries} empty="No country data yet" />
            </div>
          </AdminWhenVisible>
        </>
      ) : (
        <p className="mb-6 text-sm text-white/50">
          Website traffic tracking is not active yet — pageviews will appear here once the site
          tracking migration is applied and visitors browse the public site.
        </p>
      )}

      <h2 className="mb-4 mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">
        Mastering funnel
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Avg LUFS"
          value={data.avgLufs != null ? String(data.avgLufs) : "—"}
          accent="violet"
        />
        <KpiCard
          label="Avg processing"
          value={
            data.avgProcessingMs != null ? `${(data.avgProcessingMs / 1000).toFixed(1)}s` : "—"
          }
          accent="sky"
        />
        <KpiCard
          label="Top style"
          value={data.topStyle?.style ?? "—"}
          hint={data.topStyle ? `${data.topStyle.count} sessions` : undefined}
          accent="neutral"
        />
        <KpiCard
          label="Biggest drop-off"
          value={data.dropOffStep ?? "—"}
          accent="amber"
        />
      </div>

      <AdminWhenVisible>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FunnelChart steps={funnel} />
        <BarChartCard title="Genre distribution" items={genreDistribution} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SparklineChart title="Upload trends (daily)" points={dailyTrend} dataKey="uploads" />
        <SparklineChart
          title="Purchase trends (daily)"
          points={dailyTrend}
          dataKey="downloads"
          color="bg-emerald-500/75"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BarChartCard title="Mastering styles usage" items={styleItems} empty="No style data yet" />
        <BarChartCard
          title="Recommendation over time"
          items={recommendOverTime.map((r) => ({
            label: r.date,
            count: Math.round(r.avgRecommend * 10),
          }))}
        />
      </div>

      <div className="mt-6">
        <SparklineChart
          title="Weekly overview — masters"
          points={weeklyTrend}
          dataKey="masters"
        />
      </div>
      </AdminWhenVisible>
    </div>
  )
}
