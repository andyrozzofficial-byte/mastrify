"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { BetaDashboardSummary } from "../../../lib/adminTypes"
import { AdminPanel } from "./admin-shared"
import { BetaEngagementBadge } from "./BetaEngagementBadge"

export function BetaDashboardSummaryPanels() {
  const [summary, setSummary] = useState<BetaDashboardSummary | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/beta-users/summary", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (res.ok) setSummary(json?.summary ?? null)
    })()
  }, [])

  if (!summary) return null

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Beta program</h2>
          <p className="text-sm text-white/60">Engagement and signups from linked feedback profiles.</p>
        </div>
        <Link href="/admin/beta-users" className="text-sm font-medium text-violet-300 hover:text-violet-200">
          All beta users →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <AdminPanel title="Most active">
          <ul className="space-y-2.5">
            {summary.mostActive.length === 0 ? (
              <li className="text-sm text-white/60">No activity yet.</li>
            ) : (
              summary.mostActive.map((u) => (
                <li key={u.email} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/beta-users/${encodeURIComponent(u.email)}`}
                    className="truncate text-sm font-medium text-white hover:text-violet-200"
                  >
                    {u.name ?? u.email}
                  </Link>
                  <BetaEngagementBadge level={u.engagementLevel} score={u.engagementScore} />
                </li>
              ))
            )}
          </ul>
        </AdminPanel>

        <AdminPanel title="Recent signups">
          <ul className="space-y-2.5">
            {summary.recentSignups.length === 0 ? (
              <li className="text-sm text-white/60">No signups recorded.</li>
            ) : (
              summary.recentSignups.map((u) => (
                <li key={u.email}>
                  <Link
                    href={`/admin/beta-users/${encodeURIComponent(u.email)}`}
                    className="text-sm font-medium text-white hover:text-violet-200"
                  >
                    {u.name ?? u.email}
                  </Link>
                  <p className="text-[11px] text-white/50">
                    {u.betaRank} · {new Date(u.signupDate).toLocaleDateString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </AdminPanel>

        <AdminPanel title="Top feedback">
          <ul className="space-y-2.5">
            {summary.topFeedbackContributors.length === 0 ? (
              <li className="text-sm text-white/60">No feedback yet.</li>
            ) : (
              summary.topFeedbackContributors.map((u) => (
                <li key={u.email} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/beta-users/${encodeURIComponent(u.email)}`}
                    className="truncate text-sm font-medium text-white hover:text-violet-200"
                  >
                    {u.name ?? u.email}
                  </Link>
                  <span className="text-sm tabular-nums text-white/60">{u.feedbackCount}</span>
                </li>
              ))
            )}
          </ul>
        </AdminPanel>

        <AdminPanel title="Top issue reporters">
          <ul className="space-y-2.5">
            {summary.topIssueReporters.length === 0 ? (
              <li className="text-sm text-white/60">No issues reported yet.</li>
            ) : (
              summary.topIssueReporters.map((u) => (
                <li key={u.email} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/beta-users/${encodeURIComponent(u.email)}`}
                    className="truncate text-sm font-medium text-white hover:text-violet-200"
                  >
                    {u.name ?? u.email}
                  </Link>
                  <span className="text-sm tabular-nums text-white/60">{u.issueReportCount}</span>
                </li>
              ))
            )}
          </ul>
        </AdminPanel>
      </div>
    </div>
  )
}
