"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { AdminOverview } from "../../lib/adminTypes"
import {
  AdminPageHeader,
  formatAdminDate,
  StatusBadge,
  SummaryCard,
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
    return <p className="text-sm text-white/50">Loading overview…</p>
  }

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Beta operations overview — feedback, support, and mastering insights."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Feedback" value={String(data.feedbackTotal)} hint={`${data.feedbackNew} new`} />
        <SummaryCard label="Support inbox" value={String(data.supportTotal)} hint={`${data.supportNew} new`} />
        <SummaryCard
          label="Avg recommendation"
          value={data.avgRecommendScore != null ? String(data.avgRecommendScore) : "—"}
        />
        <SummaryCard label="Quick links" value="4" hint="Modules below" />
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
                  <StatusBadge status={r.status} />
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
              <li className="text-xs text-white/45">Inbox empty — add tickets manually</li>
            ) : (
              data.recentSupport.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/85">{r.subject ?? r.email}</p>
                    <p className="text-[10px] text-white/45">{formatAdminDate(r.created_at)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
