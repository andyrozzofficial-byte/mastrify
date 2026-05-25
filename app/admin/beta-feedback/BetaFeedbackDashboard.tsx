"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import type { BetaFeedbackDashboardData } from "../../../lib/betaFeedbackAnalytics"
import { filterAndSortTableRows } from "../../../lib/betaFeedbackAnalytics"
import { BETA_FEEDBACK_RELEASE_READY_OPTIONS } from "../../../lib/betaFeedbackTypes"

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}

function BarChart({
  title,
  items,
  maxBars = 10,
}: {
  title: string
  items: { label: string; count: number }[]
  maxBars?: number
}) {
  const slice = items.slice(0, maxBars)
  const max = Math.max(1, ...slice.map((i) => i.count))
  if (slice.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-3 text-xs text-white/45">No data yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {slice.map((item) => (
          <li key={item.label}>
            <div className="mb-1 flex justify-between gap-2 text-[11px] text-white/62">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums text-white/80">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
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

function LineChart({
  title,
  points,
}: {
  title: string
  points: { date: string; avgRecommend: number; count: number }[]
}) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-3 text-xs text-white/45">No data yet</p>
      </div>
    )
  }

  const w = 320
  const h = 120
  const pad = 12
  const minY = 0
  const maxY = 10
  const xs = points.map((_, i) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2))
  const ys = points.map(
    (p) => h - pad - ((p.avgRecommend - minY) / (maxY - minY)) * (h - pad * 2),
  )
  const poly = xs.map((x, i) => `${x},${ys[i]}`).join(" ")

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full max-w-full" aria-hidden>
        <polyline
          fill="none"
          stroke="url(#recGrad)"
          strokeWidth="2"
          strokeLinejoin="round"
          points={poly}
        />
        <defs>
          <linearGradient id="recGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        {xs.map((x, i) => (
          <circle key={points[i].date} cx={x} cy={ys[i]} r="3" fill="#a78bfa" />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/45">
        {points.map((p) => (
          <span key={p.date}>
            {p.date}: {p.avgRecommend} ({p.count})
          </span>
        ))}
      </div>
    </div>
  )
}

function ScoreTable({
  title,
  rows,
}: {
  title: string
  rows: { label: string; avgRecommend: number; count: number }[]
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-3 text-xs text-white/45">No data yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <table className="mt-3 w-full text-left text-xs">
        <thead>
          <tr className="text-white/45">
            <th className="pb-2 font-medium">Label</th>
            <th className="pb-2 font-medium">Avg NPS</th>
            <th className="pb-2 font-medium">n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-white/[0.05] text-white/78">
              <td className="py-2 pr-2">{row.label}</td>
              <td className="py-2 tabular-nums text-cyan-300/85">{row.avgRecommend}</td>
              <td className="py-2 tabular-nums text-white/55">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError("Incorrect password.")
        return
      }
      onSuccess()
    } catch {
      setError("Could not sign in. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-12">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">
        Internal admin
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Beta feedback analytics</h1>
      <p className="mt-2 text-sm text-white/55">Sign in to view submission data.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/40"
        />
        {error ? <p className="text-xs text-rose-300/90">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  )
}

export default function BetaFeedbackDashboard() {
  const [data, setData] = useState<BetaFeedbackDashboardData | null>(null)
  const [auth, setAuth] = useState<"loading" | "login" | "ready" | "unconfigured" | "error">(
    "loading",
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [genreFilter, setGenreFilter] = useState("")
  const [styleFilter, setStyleFilter] = useState("")
  const [releaseFilter, setReleaseFilter] = useState("")
  const [sort, setSort] = useState<"newest" | "highest_score">("newest")

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch("/api/admin/beta-feedback", { cache: "no-store" })
      if (res.status === 401) {
        setAuth("login")
        return
      }
      if (res.status === 503) {
        setAuth("unconfigured")
        return
      }
      if (!res.ok) {
        setAuth("error")
        setLoadError("Could not load analytics.")
        return
      }
      const json = (await res.json()) as BetaFeedbackDashboardData
      setData(json)
      setAuth("ready")
    } catch {
      setAuth("error")
      setLoadError("Could not load analytics.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filterOptions = useMemo(() => {
    if (!data) return { genres: [] as string[], styles: [] as string[] }
    const genres = [...new Set(data.rows.map((r) => r.genre))].sort()
    const styles = [...new Set(data.rows.map((r) => r.masteringStyle))].sort()
    return { genres, styles }
  }, [data])

  const tableRows = useMemo(() => {
    if (!data) return []
    return filterAndSortTableRows(data.rows, {
      search,
      genre: genreFilter,
      masteringStyle: styleFilter,
      releaseReady: releaseFilter,
      sort,
    })
  }, [data, search, genreFilter, styleFilter, releaseFilter, sort])

  if (auth === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-white/50">
        Loading…
      </div>
    )
  }

  if (auth === "login") {
    return <AdminLogin onSuccess={() => void load()} />
  }

  if (auth === "unconfigured") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-white/70">
        <h1 className="text-xl font-semibold text-white">Admin not configured</h1>
        <p className="mt-3 text-sm">
          Set <code className="text-violet-300">MASTRIFY_ADMIN_PASSWORD</code> (or{" "}
          <code className="text-violet-300">MASTRIFY_ACCESS_PASSWORD</code>) in the environment.
        </p>
      </div>
    )
  }

  if (auth === "error" || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-white/70">{loadError ?? "Something went wrong."}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  const s = data.summary

  return (
    <div className="min-h-[100dvh] bg-[#050508] text-white">
      <header className="border-b border-white/[0.06] bg-[#090912]/80 px-4 py-5 backdrop-blur-md sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/55">
          Internal · Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Beta feedback analytics</h1>
        <p className="mt-1 text-sm text-white/55">
          {s.totalSubmissions} submission{s.totalSubmissions === 1 ? "" : "s"} · live from Supabase
        </p>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <SummaryCard label="Total submissions" value={String(s.totalSubmissions)} />
          <SummaryCard
            label="Avg recommendation"
            value={s.avgRecommendScore != null ? String(s.avgRecommendScore) : "—"}
          />
          <SummaryCard
            label="Avg use-again"
            value={s.avgUseAgainScore != null ? String(s.avgUseAgainScore) : "—"}
          />
          <SummaryCard
            label="Release-ready %"
            value={s.releaseReadyPercent != null ? `${s.releaseReadyPercent}%` : "—"}
          />
          <SummaryCard label="Genres tested" value={String(s.totalGenres)} />
          <SummaryCard label="Styles tested" value={String(s.totalMasteringStyles)} />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Charts</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <LineChart title="Recommendation score over time" points={data.charts.recommendOverTime} />
            <BarChart title="Genre distribution" items={data.charts.genreDistribution} />
            <BarChart title="Mastering style distribution" items={data.charts.masteringStyleDistribution} />
            <BarChart title="Release-ready breakdown" items={data.charts.releaseReadyBreakdown} />
            <BarChart title="Most common issues reported" items={data.charts.commonIssues} />
            <BarChart title="Most requested features" items={data.charts.requestedFeatures} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Analytics</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <ScoreTable
              title="Top rated mastering styles"
              rows={data.analytics.topRatedMasteringStyles.map((r) => ({
                label: r.style,
                avgRecommend: r.avgRecommend,
                count: r.count,
              }))}
            />
            <ScoreTable
              title="Average score by genre"
              rows={data.analytics.avgScoreByGenre.map((r) => ({
                label: r.genre,
                avgRecommend: r.avgRecommend,
                count: r.count,
              }))}
            />
            <ScoreTable
              title="Average score by stereo width"
              rows={data.analytics.avgScoreByStereoWidth.map((r) => ({
                label: r.bucket,
                avgRecommend: r.avgRecommend,
                count: r.count,
              }))}
            />
            <ScoreTable
              title="Average score by low-end settings"
              rows={data.analytics.avgScoreByLowEnd.map((r) => ({
                label: r.bucket,
                avgRecommend: r.avgRecommend,
                count: r.count,
              }))}
            />
            <BarChart
              title="Processing speed satisfaction"
              items={data.analytics.processingSpeedSatisfaction}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Feedback submissions</h2>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-white/55">
              Search
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Track, genre, session…"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-violet-400/35"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/55">
              Genre
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
              >
                <option value="">All</option>
                {filterOptions.genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/55">
              Mastering style
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
              >
                <option value="">All</option>
                {filterOptions.styles.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/55">
              Release-ready
              <select
                value={releaseFilter}
                onChange={(e) => setReleaseFilter(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
              >
                <option value="">All</option>
                {BETA_FEEDBACK_RELEASE_READY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/55">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "highest_score")}
                className="rounded-lg border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
              >
                <option value="newest">Newest first</option>
                <option value="highest_score">Highest recommendation</option>
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="bg-white/[0.03] text-white/50">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Track</th>
                  <th className="px-3 py-3 font-medium">Genre</th>
                  <th className="px-3 py-3 font-medium">Style</th>
                  <th className="px-3 py-3 font-medium">Rec.</th>
                  <th className="px-3 py-3 font-medium">Again</th>
                  <th className="px-3 py-3 font-medium">Release-ready</th>
                  <th className="px-3 py-3 font-medium">Session ID</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-white/45">
                      No rows match your filters.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-white/[0.05] text-white/78 hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDate(row.date)}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5" title={row.trackName ?? ""}>
                        {row.trackName ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">{row.genre}</td>
                      <td className="max-w-[8rem] truncate px-3 py-2.5" title={row.masteringStyle}>
                        {row.masteringStyle}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-cyan-300/85">{row.recommendScore}</td>
                      <td className="px-3 py-2.5 tabular-nums">{row.useAgainScore}</td>
                      <td className="px-3 py-2.5">{row.releaseReady}</td>
                      <td className="max-w-[8rem] truncate px-3 py-2.5 font-mono text-[10px] text-white/55">
                        {row.sessionId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            Showing {tableRows.length} of {data.rows.length} submissions
          </p>
        </section>
      </main>
    </div>
  )
}
