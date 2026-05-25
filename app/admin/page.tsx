"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { AdminOverview } from "../../lib/adminTypes"
import {
  AdminPageHeader,
  FeedbackStatusBadge,
  formatAdminDate,
  SummaryCard,
  SupportStatusBadge,
} from "../components/admin/admin-shared"

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/overview", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not load overview")
        return
      }
      setData(json as AdminOverview)
    })()
  }, [])

  if (error) {
    return <p className="text-sm text-rose-300/90">{error}</p>
  }

  if (!data) {
    return <p className="text-sm text-white/50">Loading dashboard…</p>
  }

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Operations overview — KPIs, feedback, and support at a glance."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Uploads today" value={String(data.uploadsToday)} />
        <SummaryCard label="Masters completed today" value={String(data.mastersCompletedToday)} />
        <SummaryCard label="Paid downloads today" value={String(data.paidDownloadsToday)} />
        <SummaryCard
          label="Revenue today"
          value={`$${data.revenueToday.toFixed(0)}`}
          hint="From mastered_exports"
        />
        <SummaryCard
          label="Conversion rate"
          value={data.conversionRate != null ? `${data.conversionRate}%` : "—"}
          hint="Upload → purchase"
        />
        <SummaryCard label="Active users (7d)" value={String(data.activeUsers)} hint="Distinct sessions" />
        <SummaryCard label="Failed jobs" value={String(data.failedJobs)} />
        <SummaryCard
          label="Avg recommendation"
          value={data.avgRecommendScore != null ? String(data.avgRecommendScore) : "—"}
          hint={`${data.feedbackNew} new feedback`}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Feedback total" value={String(data.feedbackTotal)} />
        <SummaryCard label="Support open" value={String(data.supportOpen)} hint={`${data.supportTotal} total`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent feedback</h2>
            <Link href="/admin/feedback" className="text-xs text-violet-300/80 hover:text-violet-200">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {data.recentFeedback.length === 0 ? (
              <li className="text-xs text-white/45">No submissions yet</li>
            ) : (
              data.recentFeedback.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/85">{r.track_name ?? "Untitled track"}</p>
                    <p className="text-[10px] text-white/45">{formatAdminDate(r.created_at)}</p>
                  </div>
                  <FeedbackStatusBadge status={r.status} />
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent support</h2>
            <Link href="/admin/support" className="text-xs text-violet-300/80 hover:text-violet-200">
              View inbox
            </Link>
          </div>
          <ul className="space-y-2">
            {data.recentSupport.length === 0 ? (
              <li className="text-xs text-white/45">Inbox empty</li>
            ) : (
              data.recentSupport.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/support/${r.id}`}
                      className="truncate text-sm text-white/85 hover:text-violet-200"
                    >
                      {r.subject ?? r.email}
                    </Link>
                    <p className="text-[10px] text-white/45">{formatAdminDate(r.created_at)}</p>
                  </div>
                  <SupportStatusBadge status={r.status} />
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
