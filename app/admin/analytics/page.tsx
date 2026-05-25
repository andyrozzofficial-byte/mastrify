"use client"

import { useEffect, useMemo, useState } from "react"
import type { BetaFeedbackDashboardData } from "../../../lib/betaFeedbackAnalytics"
import { filterAndSortTableRows } from "../../../lib/betaFeedbackAnalytics"
import {
  AdminPageHeader,
  AdminSearchInput,
  SummaryCard,
} from "../../components/admin/admin-shared"

function BarChart({
  title,
  items,
}: {
  title: string
  items: { label: string; count: number }[]
}) {
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
  const [data, setData] = useState<BetaFeedbackDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"newest" | "highest_score">("newest")

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not load analytics")
        return
      }
      setData(json as BetaFeedbackDashboardData)
    })()
  }, [])

  const tableRows = useMemo(() => {
    if (!data) return []
    return filterAndSortTableRows(data.rows, {
      search,
      genre: "",
      masteringStyle: "",
      releaseReady: "",
      sort,
    })
  }, [data, search, sort])

  if (error) return <p className="text-sm text-rose-300/90">{error}</p>
  if (!data) return <p className="text-sm text-white/50">Loading analytics…</p>

  const s = data.summary

  return (
    <div>
      <AdminPageHeader title="Analytics" subtitle="Beta feedback trends and distributions." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Submissions" value={String(s.totalSubmissions)} />
        <SummaryCard label="Avg recommend" value={s.avgRecommendScore != null ? String(s.avgRecommendScore) : "—"} />
        <SummaryCard label="Avg use-again" value={s.avgUseAgainScore != null ? String(s.avgUseAgainScore) : "—"} />
        <SummaryCard label="Release-ready %" value={s.releaseReadyPercent != null ? `${s.releaseReadyPercent}%` : "—"} />
        <SummaryCard label="Genres" value={String(s.totalGenres)} />
        <SummaryCard label="Styles" value={String(s.totalMasteringStyles)} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <BarChart title="Genre distribution" items={data.charts.genreDistribution} />
        <BarChart title="Mastering styles" items={data.charts.masteringStyleDistribution} />
        <BarChart title="Common issues" items={data.charts.commonIssues} />
        <BarChart title="Requested features" items={data.charts.requestedFeatures} />
        <BarChart title="Processing speed" items={data.analytics.processingSpeedSatisfaction} />
        <BarChart title="Release-ready" items={data.charts.releaseReadyBreakdown} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap gap-3">
          <AdminSearchInput value={search} onChange={setSearch} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "highest_score")}
            className="rounded-xl border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
          >
            <option value="newest">Newest</option>
            <option value="highest_score">Highest score</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-white/[0.03] text-white/50">
              <tr>
                <th className="px-3 py-2">Track</th>
                <th className="px-3 py-2">Genre</th>
                <th className="px-3 py-2">Rec.</th>
                <th className="px-3 py-2">Release</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-t border-white/[0.05]">
                  <td className="px-3 py-2">{r.trackName ?? "—"}</td>
                  <td className="px-3 py-2">{r.genre}</td>
                  <td className="px-3 py-2 text-cyan-300/85">{r.recommendScore}</td>
                  <td className="px-3 py-2">{r.releaseReady}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
