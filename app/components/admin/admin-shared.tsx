"use client"

import Link from "next/link"
import type {
  AdminFeedbackStatus,
  AdminJobStatus,
  AdminSupportPriority,
  AdminSupportStatus,
} from "../../../lib/adminTypes"
import {
  ADMIN_FEEDBACK_STATUSES,
  ADMIN_JOB_STATUSES,
  ADMIN_SUPPORT_PRIORITIES,
  ADMIN_SUPPORT_STATUSES,
} from "../../../lib/adminTypes"

export function formatAdminDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

const FEEDBACK_STATUS_STYLES: Record<AdminFeedbackStatus, string> = {
  new: "bg-violet-500/20 text-violet-200 ring-violet-400/30",
  read: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
  resolved: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
}

const SUPPORT_STATUS_STYLES: Record<AdminSupportStatus, string> = {
  open: "bg-violet-500/20 text-violet-200 ring-violet-400/30",
  waiting_for_customer: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
  resolved: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
  closed: "bg-white/10 text-white/55 ring-white/15",
}

const PRIORITY_STYLES: Record<AdminSupportPriority, string> = {
  low: "bg-white/8 text-white/55 ring-white/12",
  medium: "bg-sky-500/12 text-sky-200 ring-sky-400/20",
  high: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
}

const JOB_STATUS_STYLES: Record<AdminJobStatus, string> = {
  processing: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
  complete: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
  failed: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
}

function badgeClass(styles: Record<string, string>, key: string) {
  return styles[key] ?? "bg-white/10 text-white/60 ring-white/15"
}

function formatLabel(s: string) {
  return s.replace(/_/g, " ")
}

export function FeedbackStatusBadge({ status }: { status: AdminFeedbackStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badgeClass(FEEDBACK_STATUS_STYLES, status)}`}
    >
      {status}
    </span>
  )
}

export function SupportStatusBadge({ status }: { status: AdminSupportStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize tracking-wide ring-1 ${badgeClass(SUPPORT_STATUS_STYLES, status)}`}
    >
      {formatLabel(status)}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: AdminSupportPriority }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badgeClass(PRIORITY_STYLES, priority)}`}
    >
      {priority}
    </span>
  )
}

export function JobStatusBadge({ status }: { status: AdminJobStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize tracking-wide ring-1 ${badgeClass(JOB_STATUS_STYLES, status)}`}
    >
      {status}
    </span>
  )
}

/** @deprecated Use FeedbackStatusBadge */
export function StatusBadge({ status }: { status: AdminFeedbackStatus }) {
  return <FeedbackStatusBadge status={status} />
}

export function FeedbackStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: AdminFeedbackStatus
  onChange: (s: AdminFeedbackStatus) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AdminFeedbackStatus)}
      className="rounded-lg border border-white/[0.1] bg-[#090912] px-2.5 py-1.5 text-xs text-white"
    >
      {ADMIN_FEEDBACK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  )
}

export function SupportStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: AdminSupportStatus
  onChange: (s: AdminSupportStatus) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AdminSupportStatus)}
      className="rounded-lg border border-white/[0.1] bg-[#090912] px-2.5 py-1.5 text-xs text-white"
    >
      {ADMIN_SUPPORT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {formatLabel(s)}
        </option>
      ))}
    </select>
  )
}

export function PrioritySelect({
  value,
  onChange,
  disabled,
}: {
  value: AdminSupportPriority
  onChange: (p: AdminSupportPriority) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AdminSupportPriority)}
      className="rounded-lg border border-white/[0.1] bg-[#090912] px-2.5 py-1.5 text-xs text-white"
    >
      {ADMIN_SUPPORT_PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  )
}

export function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-white/45">{hint}</p> : null}
    </div>
  )
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search…"}
      className="w-full min-w-[12rem] flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-violet-400/35 sm:max-w-xs"
    />
  )
}

export function AdminEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-12 text-center text-sm text-white/50">
      {message}
    </div>
  )
}

export function FunnelChart({ steps }: { steps: { step: string; count: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count))
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-white">Conversion funnel</h3>
      <ul className="mt-4 space-y-3">
        {steps.map((item) => (
          <li key={item.step}>
            <div className="mb-1 flex justify-between text-[11px] text-white/62">
              <span>{item.step}</span>
              <span>{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06]">
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

export function TrendChart({
  title,
  points,
  keys,
}: {
  title: string
  points: Record<string, string | number>[]
  keys: { key: string; label: string; color: string }[]
}) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-2 text-xs text-white/45">No trend data yet</p>
      </div>
    )
  }
  const max = Math.max(
    1,
    ...points.flatMap((p) => keys.map((k) => Number(p[k.key]) || 0)),
  )
  const dateKey = points[0].date != null ? "date" : "week"
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-3">
        {points.map((p) => (
          <li key={String(p[dateKey])}>
            <p className="mb-1 text-[10px] text-white/45">{String(p[dateKey])}</p>
            {keys.map((k) => (
              <div key={k.key} className="mb-1">
                <div className="flex justify-between text-[10px] text-white/55">
                  <span>{k.label}</span>
                  <span>{Number(p[k.key]) || 0}</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${k.color}`}
                    style={{ width: `${((Number(p[k.key]) || 0) / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/jobs", label: "Master Jobs" },
  { href: "/admin/settings", label: "Settings" },
] as const

export function AdminNavLink({
  href,
  label,
  exact,
  pathname,
}: {
  href: string
  label: string
  exact?: boolean
  pathname: string
}) {
  const active = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-violet-500/15 text-white ring-1 ring-violet-400/25"
          : "text-white/62 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {label}
    </Link>
  )
}
