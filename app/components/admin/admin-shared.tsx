"use client"

import Link from "next/link"
import type {
  AdminFeedbackStatus,
  AdminJobStatus,
  AdminNavBadges,
  AdminSupportPriority,
  AdminSupportStatus,
} from "../../../lib/adminTypes"
import {
  ADMIN_FEEDBACK_STATUSES,
  ADMIN_JOB_STATUSES,
  ADMIN_SUPPORT_PRIORITIES,
  ADMIN_SUPPORT_STATUSES,
} from "../../../lib/adminTypes"
import { ADMIN_ICON_MAP, type AdminNavIconKey } from "./AdminIcons"

export function formatAdminDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

export function avatarInitials(email: string) {
  const part = email.split("@")[0] ?? "?"
  const bits = part.replace(/[^a-zA-Z0-9]/g, " ").trim().split(/\s+/)
  if (bits.length >= 2) return (bits[0][0] + bits[1][0]).toUpperCase()
  return part.slice(0, 2).toUpperCase()
}

export function AvatarCircle({ email, size = "md" }: { email: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs"
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-800 ring-1 ring-violet-200/80 ${dim}`}
    >
      {avatarInitials(email)}
    </span>
  )
}

const FEEDBACK_STATUS_STYLES: Record<AdminFeedbackStatus, string> = {
  new: "bg-violet-100 text-violet-800 ring-violet-200",
  read: "bg-sky-100 text-sky-800 ring-sky-200",
  resolved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
}

const SUPPORT_STATUS_STYLES: Record<AdminSupportStatus, string> = {
  open: "bg-violet-100 text-violet-800 ring-violet-200",
  waiting_for_customer: "bg-amber-100 text-amber-900 ring-amber-200",
  resolved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
}

const PRIORITY_STYLES: Record<AdminSupportPriority, string> = {
  low: "bg-slate-100 text-slate-600 ring-slate-200",
  medium: "bg-sky-100 text-sky-800 ring-sky-200",
  high: "bg-rose-100 text-rose-800 ring-rose-200",
}

const JOB_STATUS_STYLES: Record<AdminJobStatus, string> = {
  processing: "bg-amber-100 text-amber-900 ring-amber-200",
  complete: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-100 text-rose-800 ring-rose-200",
}

function badgeClass(styles: Record<string, string>, key: string) {
  return styles[key] ?? "bg-slate-100 text-slate-600 ring-slate-200"
}

function formatLabel(s: string) {
  return s.replace(/_/g, " ")
}

export function FeedbackStatusBadge({ status }: { status: AdminFeedbackStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badgeClass(FEEDBACK_STATUS_STYLES, status)}`}
    >
      {status}
    </span>
  )
}

export function SupportStatusBadge({ status }: { status: AdminSupportStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize tracking-wide ring-1 ${badgeClass(SUPPORT_STATUS_STYLES, status)}`}
    >
      {formatLabel(status)}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: AdminSupportPriority }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badgeClass(PRIORITY_STYLES, priority)}`}
    >
      {priority}
    </span>
  )
}

export function JobStatusBadge({ status }: { status: AdminJobStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize tracking-wide ring-1 ${badgeClass(JOB_STATUS_STYLES, status)}`}
    >
      {status === "processing" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" aria-hidden />
      ) : null}
      {status}
    </span>
  )
}

export function StatusBadge({ status }: { status: AdminFeedbackStatus }) {
  return <FeedbackStatusBadge status={status} />
}

export function AdminCard({
  children,
  className = "",
  hover = false,
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-200/60 transition duration-200 ${
        hover ? "hover:border-violet-200/80 hover:shadow-md hover:shadow-violet-100/40" : ""
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: "violet" | "emerald" | "sky" | "amber" | "neutral"
}) {
  const accentBar =
    accent === "violet"
      ? "from-violet-500/80 to-transparent"
      : accent === "emerald"
        ? "from-emerald-500/70 to-transparent"
        : accent === "sky"
          ? "from-sky-500/70 to-transparent"
          : accent === "amber"
            ? "from-amber-500/70 to-transparent"
            : "from-white/20 to-transparent"

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-200/60 transition duration-200 hover:-translate-y-0.5 hover:border-violet-200/70 hover:shadow-md hover:shadow-violet-100/30">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentBar}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  )
}

/** @deprecated Use KpiCard */
export function SummaryCard(props: { label: string; value: string; hint?: string }) {
  return <KpiCard {...props} />
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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/80">Mastrify Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search…"}
      className={`w-full min-w-[12rem] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:max-w-sm ${className}`}
    />
  )
}

export function AdminSelect({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 ${className}`}
    >
      {children}
    </select>
  )
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
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
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
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
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
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
    >
      {ADMIN_SUPPORT_PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  )
}

export function AdminEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 py-14 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}

export function AdminPanel({
  title,
  href,
  children,
}: {
  title: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <AdminCard>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {href ? (
          <Link href={href} className="text-xs font-medium text-violet-600 transition hover:text-violet-800">
            View all →
          </Link>
        ) : null}
      </div>
      {children}
    </AdminCard>
  )
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/50">
      <table className="w-full min-w-[640px] text-left text-[13px]">{children}</table>
    </div>
  )
}

export function FunnelChart({ steps }: { steps: { step: string; count: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count))
  return (
    <AdminCard>
      <h3 className="text-[15px] font-semibold text-slate-900">Conversion funnel</h3>
      <ul className="mt-5 space-y-4">
        {steps.map((item) => (
          <li key={item.step}>
            <div className="mb-2 flex justify-between text-[13px] text-slate-600">
              <span>{item.step}</span>
              <span className="tabular-nums font-medium text-slate-900">{item.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </AdminCard>
  )
}

export function BarChartCard({
  title,
  items,
  empty = "No data yet",
}: {
  title: string
  items: { label: string; count: number }[]
  empty?: string
}) {
  const slice = items.slice(0, 12)
  const max = Math.max(1, ...slice.map((i) => i.count))
  if (slice.length === 0) {
    return (
      <AdminCard>
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      </AdminCard>
    )
  }
  return (
    <AdminCard>
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
      <ul className="mt-5 space-y-3">
        {slice.map((item) => (
          <li key={item.label}>
            <div className="mb-1.5 flex justify-between gap-2 text-[12px] text-slate-600">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums font-medium text-slate-800">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </AdminCard>
  )
}

export function SparklineChart({
  title,
  points,
  dataKey,
  color = "bg-violet-500/80",
}: {
  title: string
  points: Record<string, string | number>[]
  dataKey: string
  color?: string
}) {
  const values = points.map((p) => Number(p[dataKey]) || 0)
  const max = Math.max(1, ...values)
  const dateKey = points[0]?.date != null ? "date" : "week"

  if (points.length === 0) {
    return (
      <AdminCard>
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm text-slate-500">No trend data yet</p>
      </AdminCard>
    )
  }

  return (
    <AdminCard>
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
      <div className="mt-5 flex h-28 items-end gap-1.5">
        {points.map((p, i) => (
          <div key={String(p[dateKey]) + i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={`w-full min-w-[6px] max-w-[20px] rounded-t-md ${color} transition-all duration-300`}
              style={{ height: `${Math.max(8, (values[i] / max) * 100)}%` }}
              title={`${values[i]}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-slate-400">
        <span>{String(points[0]?.[dateKey])}</span>
        <span>{String(points[points.length - 1]?.[dateKey])}</span>
      </div>
    </AdminCard>
  )
}

/** @deprecated */
export function TrendChart({
  title,
  points,
  keys,
}: {
  title: string
  points: Record<string, string | number>[]
  keys: { key: string; label: string; color: string }[]
}) {
  return (
    <AdminCard>
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {points.map((p) => {
          const dateKey = p.date != null ? "date" : "week"
          const max = Math.max(1, ...keys.map((k) => Number(p[k.key]) || 0))
          return (
            <li key={String(p[dateKey])}>
              <p className="mb-2 text-[11px] text-white/42">{String(p[dateKey])}</p>
              {keys.map((k) => (
                <div key={k.key} className="mb-1">
                  <div className="flex justify-between text-[11px] text-white/55">
                    <span>{k.label}</span>
                    <span>{Number(p[k.key]) || 0}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#252528]">
                    <div
                      className={`h-full rounded-full ${k.color}`}
                      style={{ width: `${((Number(p[k.key]) || 0) / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </li>
          )
        })}
      </ul>
    </AdminCard>
  )
}

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", exact: true, icon: "dashboard" as AdminNavIconKey, badgeKey: null },
  { href: "/admin/feedback", label: "Feedback", icon: "feedback" as AdminNavIconKey, badgeKey: "feedback" as const },
  { href: "/admin/support", label: "Support", icon: "support" as AdminNavIconKey, badgeKey: "support" as const },
  { href: "/admin/customers", label: "Customers", icon: "customers" as AdminNavIconKey, badgeKey: null },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" as AdminNavIconKey, badgeKey: null },
  { href: "/admin/jobs", label: "Master Jobs", icon: "jobs" as AdminNavIconKey, badgeKey: null },
  { href: "/admin/settings", label: "Settings", icon: "settings" as AdminNavIconKey, badgeKey: null },
] as const

export function AdminNavLink({
  href,
  label,
  icon,
  exact,
  pathname,
  badge,
}: {
  href: string
  label: string
  icon: AdminNavIconKey
  exact?: boolean
  pathname: string
  badge?: number
}) {
  const active = exact ? pathname === href : pathname.startsWith(href)
  const Icon = ADMIN_ICON_MAP[icon]

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition duration-200 ${
        active
          ? "bg-violet-50 text-violet-900 shadow-sm ring-1 ring-violet-200/80"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
          active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500 group-hover:text-slate-700"
        }`}
      >
        <Icon />
      </span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="min-w-[1.25rem] rounded-full bg-violet-600 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  )
}

export type { AdminNavBadges }
