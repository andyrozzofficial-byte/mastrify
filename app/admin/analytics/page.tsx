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
        subtitle="Funnel performance, loudness, genres, styles, and processing trends."
      />

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
