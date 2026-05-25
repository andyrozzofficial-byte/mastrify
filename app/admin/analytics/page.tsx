"use client"

import { useEffect, useState } from "react"
import type { AdminAnalyticsExtended } from "../../../lib/adminTypes"
import {
  AdminPageHeader,
  FunnelChart,
  SummaryCard,
  TrendChart,
} from "../../components/admin/admin-shared"

function BarList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const slice = items.slice(0, 10)
  const max = Math.max(1, ...slice.map((i) => i.count))
  if (slice.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-2 text-xs text-white/45">No data</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2">
        {slice.map((item) => (
          <li key={item.label}>
            <div className="mb-1 flex justify-between text-[11px] text-white/62">
              <span className="truncate">{item.label}</span>
              <span>{item.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsExtended | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not load analytics")
        return
      }
      setData(json as AdminAnalyticsExtended)
    })()
  }, [])

  if (error) return <p className="text-sm text-rose-300/90">{error}</p>
  if (!data) return <p className="text-sm text-white/50">Loading analytics…</p>

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        subtitle="Funnel, loudness, styles, processing time, and trends."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Avg LUFS"
          value={data.avgLufs != null ? String(data.avgLufs) : "—"}
        />
        <SummaryCard
          label="Avg processing"
          value={
            data.avgProcessingMs != null
              ? `${(data.avgProcessingMs / 1000).toFixed(1)}s`
              : "—"
          }
        />
        <SummaryCard
          label="Top style"
          value={data.topStyle?.style ?? "—"}
          hint={data.topStyle ? `${data.topStyle.count} uses` : undefined}
        />
        <SummaryCard
          label="Biggest drop-off"
          value={data.dropOffStep ?? "—"}
          hint="Largest funnel step loss"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <FunnelChart steps={data.funnel} />
        <BarList
          title="Genre distribution"
          items={data.genreDistribution.map((g) => ({ label: g.label, count: g.count }))}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TrendChart
          title="Daily trends"
          points={data.dailyTrend}
          keys={[
            { key: "uploads", label: "Uploads", color: "bg-violet-500" },
            { key: "masters", label: "Masters", color: "bg-indigo-500" },
            { key: "downloads", label: "Downloads", color: "bg-cyan-500" },
          ]}
        />
        <TrendChart
          title="Weekly trends"
          points={data.weeklyTrend}
          keys={[
            { key: "uploads", label: "Uploads", color: "bg-violet-500" },
            { key: "masters", label: "Masters", color: "bg-indigo-500" },
            { key: "downloads", label: "Downloads", color: "bg-cyan-500" },
          ]}
        />
      </div>

      <div className="mt-4">
        <BarList
          title="Recommendation score over time"
          items={data.recommendOverTime.map((r) => ({
            label: r.date,
            count: Math.round(r.avgRecommend * 10),
          }))}
        />
      </div>
    </div>
  )
}
