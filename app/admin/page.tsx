"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { AdminOverview } from "../../lib/adminTypes"
import {
  AdminPageHeader,
  AdminPanel,
  FeedbackStatusBadge,
  formatAdminDate,
  JobStatusBadge,
  KpiCard,
  PriorityBadge,
  SupportStatusBadge,
} from "../components/admin/admin-shared"

const activityLabels = {
  master: "Master",
  purchase: "Purchase",
  feedback: "Feedback",
  support: "Support",
} as const

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
    return <p className="text-sm text-rose-600">{error}</p>
  }

  if (!data) {
    return <p className="text-sm text-slate-600">Loading dashboard…</p>
  }

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Your internal control center — masters, revenue, support, and product signals in one place."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Uploads today" value={String(data.uploadsToday)} accent="sky" />
        <KpiCard label="Masters completed" value={String(data.mastersCompletedToday)} accent="violet" />
        <KpiCard label="Paid downloads" value={String(data.paidDownloadsToday)} accent="emerald" />
        <KpiCard label="Revenue today" value={`$${data.revenueToday.toFixed(0)}`} accent="emerald" />
        <KpiCard
          label="Conversion rate"
          value={data.conversionRate != null ? `${data.conversionRate}%` : "—"}
          hint="Upload → purchase"
          accent="violet"
        />
        <KpiCard label="Active users (7d)" value={String(data.activeUsers)} accent="neutral" />
        <KpiCard label="Failed jobs" value={String(data.failedJobs)} accent="amber" />
        <KpiCard
          label="Avg recommendation"
          value={data.avgRecommendScore != null ? String(data.avgRecommendScore) : "—"}
          hint={`${data.feedbackNew} new feedback`}
          accent="violet"
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminPanel title="Latest activity">
            <ul className="divide-y divide-slate-200">
              {data.recentActivity.length === 0 ? (
                <li className="py-6 text-sm text-slate-600">No recent activity yet.</li>
              ) : (
                data.recentActivity.map((item) => (
                  <li key={item.id} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                    <span className="mt-0.5 w-28 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {item.type === "master" ? item.title : activityLabels[item.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      {item.details && item.details.length > 0 ? (
                        <ul className="space-y-0.5">
                          {item.details.map((line) => (
                            <li key={line} className="text-[14px] text-slate-800">
                              <span className="text-slate-400" aria-hidden>
                                →{" "}
                              </span>
                              {item.href && line === item.details?.[0] ? (
                                <Link href={item.href} className="font-medium text-violet-700 hover:text-violet-900">
                                  {line}
                                </Link>
                              ) : (
                                <span className={line === item.details?.[0] ? "font-medium text-slate-900" : ""}>
                                  {line}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : item.href ? (
                        <Link href={item.href} className="text-[14px] font-medium text-slate-900 hover:text-violet-700">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-[14px] font-medium text-slate-900">{item.title}</p>
                      )}
                      {item.subtitle ? (
                        <p className="mt-0.5 truncate text-[12px] text-slate-600">{item.subtitle}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500">{formatAdminDate(item.created_at)}</span>
                  </li>
                ))
              )}
            </ul>
          </AdminPanel>
        </div>

        <AdminPanel title="Inbox snapshot">
          <dl className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <dt className="text-sm text-slate-700">Open support</dt>
              <dd className="text-xl font-semibold tabular-nums text-slate-950">{data.supportOpen}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <dt className="text-sm text-slate-700">New feedback</dt>
              <dd className="text-xl font-semibold tabular-nums text-slate-950">{data.feedbackNew}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <dt className="text-sm text-slate-700">Total feedback</dt>
              <dd className="text-lg tabular-nums text-slate-800">{data.feedbackTotal}</dd>
            </div>
          </dl>
        </AdminPanel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Recent masters" href="/admin/jobs">
          <ul className="space-y-3">
            {data.recentMasters.length === 0 ? (
              <li className="text-sm text-slate-600">No masters yet.</li>
            ) : (
              data.recentMasters.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 transition hover:border-slate-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-slate-900">
                      {r.track_name ?? "Untitled track"}
                    </p>
                    <p className="text-[12px] text-slate-600">{r.mastering_style ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <JobStatusBadge status={r.status} />
                    <span className="text-[10px] text-slate-500">{formatAdminDate(r.created_at)}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </AdminPanel>

        <AdminPanel title="Recent purchases" href="/admin/customers">
          <ul className="space-y-3">
            {data.recentPurchases.length === 0 ? (
              <li className="text-sm text-slate-600">No export deliveries recorded yet.</li>
            ) : (
              data.recentPurchases.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 transition hover:border-slate-300"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(r.email)}`}
                      className="truncate text-[14px] font-medium text-slate-900 hover:text-violet-700"
                    >
                      {r.email}
                    </Link>
                    <p className="truncate text-[12px] text-slate-600">{r.track_title ?? "Master export"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-emerald-700">${r.amount}</p>
                    <p className="text-[10px] text-slate-500">{formatAdminDate(r.created_at)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </AdminPanel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Recent feedback" href="/admin/feedback">
          <ul className="space-y-3">
            {data.recentFeedback.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/feedback/${r.id}`}
                    className="truncate text-[14px] font-medium text-slate-900 hover:text-violet-700"
                  >
                    {r.track_name ?? "Untitled"}
                  </Link>
                  <p className="text-[10px] text-slate-500">{formatAdminDate(r.created_at)}</p>
                </div>
                <FeedbackStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </AdminPanel>

        <AdminPanel title="Recent support" href="/admin/support">
          <ul className="space-y-3">
            {data.recentSupport.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/support/${r.id}`}
                    className="truncate text-[14px] font-medium text-slate-900 hover:text-violet-700"
                  >
                    {r.subject ?? r.email}
                  </Link>
                  <p className="text-[10px] text-slate-500">{formatAdminDate(r.created_at)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <PriorityBadge priority={r.priority} />
                  <SupportStatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </div>
  )
}
