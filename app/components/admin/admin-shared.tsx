"use client"

import { memo, useMemo } from "react"
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
  SUPPORT_STATUS_LABELS,
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-violet-500/20 font-semibold text-violet-100 ring-1 ring-violet-400/30 ${dim}`}
    >
      {avatarInitials(email)}
    </span>
  )
}

const FEEDBACK_STATUS_STYLES: Record<AdminFeedbackStatus, string> = {
  new: "bg-violet-500/15 text-violet-200 ring-violet-400/25",
  read: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
  resolved: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
}

const SUPPORT_STATUS_STYLES: Record<AdminSupportStatus, string> = {
  open: "bg-violet-500/15 text-violet-200 ring-violet-400/25",
  waiting_for_customer: "bg-violet-500/10 text-violet-100/90 ring-violet-400/20",
  resolved: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
  closed: "bg-white/[0.06] text-white/50 ring-white/10",
}

const PRIORITY_STYLES: Record<AdminSupportPriority, string> = {
  low: "bg-white/[0.06] text-white/55 ring-white/10",
  medium: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
  high: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
}

const JOB_STATUS_STYLES: Record<AdminJobStatus, string> = {
  processing: "bg-violet-500/12 text-violet-100 ring-violet-400/20",
  complete: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
  failed: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
}

function badgeClass(styles: Record<string, string>, key: string) {
  return styles[key] ?? "bg-white/[0.06] text-white/55 ring-white/10"
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
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ring-1 ${badgeClass(SUPPORT_STATUS_STYLES, status)}`}
    >
      {SUPPORT_STATUS_LABELS[status]}
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

function formatSelectLabel(s: string) {
  return s.replace(/_/g, " ")
}

export function JobStatusBadge({ status }: { status: AdminJobStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize tracking-wide ring-1 ${badgeClass(JOB_STATUS_STYLES, status)}`}
    >
      {status === "processing" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300" aria-hidden />
      ) : null}
      {status}
    </span>
  )
}

export function StatusBadge({ status }: { status: AdminFeedbackStatus }) {
  return <FeedbackStatusBadge status={status} />
}

const BETA_RANK_STYLES: Record<string, string> = {
  explorer: "bg-white/[0.06] text-white/70 ring-white/12",
  insider: "bg-violet-500/12 text-violet-200 ring-violet-400/25",
  pioneer: "bg-indigo-500/18 text-indigo-100 ring-indigo-400/28",
  legend: "bg-violet-600/25 text-violet-50 ring-violet-300/35 shadow-[0_0_12px_rgba(139,92,246,0.12)]",
  founder: "bg-amber-500/15 text-amber-100 ring-amber-400/28",
  founding: "bg-violet-600/25 text-violet-50 ring-violet-300/35 shadow-[0_0_12px_rgba(139,92,246,0.12)]",
}

export function BetaRankBadge({ rank }: { rank: string }) {
  const key = rank.trim().toLowerCase()
  const style = BETA_RANK_STYLES[key] ?? "bg-violet-500/12 text-violet-200 ring-violet-400/25"
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${style}`}
    >
      {rank}
    </span>
  )
}

export const ADMIN_BUTTON_PRIMARY =
  "inline-flex min-h-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] transition hover:brightness-110 disabled:opacity-50"

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
      className={`rounded-2xl border border-white/[0.12] bg-white/[0.05] p-6 shadow-[0_0_40px_rgba(0,0,0,0.22)] transition duration-200 max-md:p-4 ${
        hover ? "hover:border-violet-400/35 hover:bg-white/[0.065]" : ""
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
            : "from-white/15 to-transparent"

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.05] p-6 shadow-[0_0_40px_rgba(0,0,0,0.22)] transition duration-200 max-md:p-4 hover:-translate-y-0.5 hover:border-violet-400/35 max-md:hover:translate-y-0">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentBar}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-2 text-[13px] leading-relaxed text-white/65">{hint}</p> : null}
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">Mastrify Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/60">{subtitle}</p> : null}
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
      className={`w-full min-w-[12rem] flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20 sm:max-w-sm ${className}`}
    />
  )
}

export function AdminSelect({
  label,
  value,
  onChange,
  options,
  children,
  className = "",
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options?: { value: string; label: string }[]
  children?: React.ReactNode
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label ? <span className="text-xs font-medium text-white/50">{label}</span> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20"
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value || "__empty__"} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    </label>
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
      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white"
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
      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white"
    >
      {ADMIN_SUPPORT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {SUPPORT_STATUS_LABELS[s]}
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
      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white"
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
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.03] px-8 py-14 text-center text-sm text-white/60">
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
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        {href ? (
          <Link href={href} className="text-xs font-medium text-violet-300 transition hover:text-violet-200">
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
    <div className="admin-desktop-table overflow-x-auto rounded-2xl border border-white/[0.12] bg-white/[0.03]">
      <table className="w-full min-w-[640px] text-left text-[13px]">{children}</table>
    </div>
  )
}

export function AdminMobileCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/[0.04] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      {children}
    </div>
  )
}

export function AdminMobileField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 border-t border-white/[0.06] py-2 first:min-h-0 first:border-0 first:pt-0">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-white/45">{label}</span>
      <div className="min-w-0 text-right text-sm text-white/85">{children}</div>
    </div>
  )
}

export function AdminMobileCardList({ children }: { children: React.ReactNode }) {
  return <div className="admin-mobile-card-list">{children}</div>
}

const RATING_CHART_BAR_MAX_PX = 120

function RatingDistributionChartInner({
  title,
  items,
  emptyLabel = "No responses yet",
}: {
  title: string
  items: { label: string; count: number }[]
  emptyLabel?: string
}) {
  const safeItems = items ?? []
  const maxCount = Math.max(1, ...safeItems.map((i) => i.count))
  const hasData = safeItems.some((i) => i.count > 0)

  return (
    <AdminCard className="admin-chart-card min-w-0 max-w-full overflow-hidden">
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      {!hasData ? (
        <p className="mt-3 text-sm text-white/55">{emptyLabel}</p>
      ) : (
        <div className="mt-4 w-full max-w-full overflow-hidden">
          <div
            className="flex w-full items-end justify-between gap-0.5 sm:gap-1"
            style={{ height: RATING_CHART_BAR_MAX_PX }}
          >
            {safeItems.map((item) => {
              const barPx =
                item.count > 0
                  ? Math.max(4, Math.round((item.count / maxCount) * RATING_CHART_BAR_MAX_PX))
                  : 0
              return (
                <div
                  key={item.label}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  {item.count > 0 ? (
                    <span className="text-[9px] font-medium tabular-nums text-white/55">{item.count}</span>
                  ) : (
                    <span className="h-[12px]" aria-hidden />
                  )}
                  <div
                    className="w-full max-w-[20px] rounded-t-md bg-gradient-to-t from-violet-700 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                    style={{ height: barPx > 0 ? `${barPx}px` : "2px", opacity: barPx > 0 ? 1 : 0.15 }}
                    title={`${item.label}: ${item.count}`}
                  />
                  <span className="w-full truncate text-center text-[9px] tabular-nums text-white/45">
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AdminCard>
  )
}

export const RatingDistributionChart = memo(RatingDistributionChartInner)

function FunnelChartInner({ steps }: { steps: { step: string; count: number }[] }) {
  const safeSteps = steps ?? []
  const max = Math.max(1, ...(safeSteps.map((s) => s.count) ?? [0]))
  return (
    <AdminCard>
      <h3 className="text-[15px] font-semibold text-white">Conversion funnel</h3>
      <ul className="mt-5 space-y-4">
        {safeSteps.map((item) => (
          <li key={item.step}>
            <div className="mb-2 flex justify-between text-[13px] text-white/60">
              <span>{item.step}</span>
              <span className="tabular-nums font-medium text-white">{item.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
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

export const FunnelChart = memo(FunnelChartInner)

function BarChartCardInner({
  title,
  items,
  empty = "No trend data yet",
}: {
  title: string
  items: { label: string; count: number }[]
  empty?: string
}) {
  const slice = (items ?? []).slice(0, 12)
  const max = Math.max(1, ...slice.map((i) => i.count))
  if (slice.length === 0) {
    return (
      <AdminCard>
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm text-white/60">{empty}</p>
      </AdminCard>
    )
  }
  return (
    <AdminCard>
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      <ul className="mt-5 space-y-3">
        {slice.map((item) => (
          <li key={item.label}>
            <div className="mb-1.5 flex justify-between gap-2 text-[12px] text-white/60">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums font-medium text-white">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
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

export const BarChartCard = memo(BarChartCardInner)

function strokeFromChartColor(color: string): { stroke: string; fill: string } {
  if (color.includes("emerald")) {
    return { stroke: "#10b981", fill: "rgba(16,185,129,0.12)" }
  }
  if (color.includes("sky")) {
    return { stroke: "#0ea5e9", fill: "rgba(14,165,233,0.12)" }
  }
  return { stroke: "#7c3aed", fill: "rgba(124,58,237,0.12)" }
}

function SparklineChartInner({
  title,
  points,
  dataKey,
  color = "bg-violet-500/80",
  emptyLabel = "No trend data yet",
}: {
  title: string
  points: Record<string, string | number>[]
  dataKey: string
  color?: string
  emptyLabel?: string
}) {
  const safePoints = points ?? []
  const values = safePoints.map((p) => Number(p[dataKey]) || 0)
  const dateKey = safePoints[0]?.date != null ? "date" : "week"
  const { stroke, fill } = strokeFromChartColor(color)
  const chartId = `trend-${title.replace(/\W+/g, "-").toLowerCase()}`

  if (safePoints.length === 0) {
    return (
      <AdminCard>
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm text-white/60">{emptyLabel}</p>
      </AdminCard>
    )
  }

  const width = 280
  const height = 96
  const padX = 8
  const padY = 10
  const plotW = width - padX * 2
  const plotH = height - padY * 2
  const max = Math.max(1, ...values)
  const plotValues = values.length === 1 ? [values[0], values[0]] : values
  const step = plotW / Math.max(plotValues.length - 1, 1)

  const coords = plotValues.map((v, i) => {
    const x = padX + i * step
    const y = padY + plotH - (v / max) * plotH
    return { x, y, v }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padY + plotH} L ${coords[0].x} ${padY + plotH} Z`
  const latest = values[values.length - 1] ?? 0
  const peak = Math.max(...values)

  return (
    <AdminCard className="admin-chart-card min-w-0 max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        <div className="text-right text-[11px] tabular-nums text-white/60">
          <span className="font-semibold text-white">{latest}</span>
          <span className="mx-1 text-white/35">·</span>
          peak {peak}
        </div>
      </div>
      <div className="mt-4 w-full max-w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-28 w-full max-w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${title} line chart`}
        >
          <defs>
            <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={padX}
              x2={width - padX}
              y1={padY + plotH * t}
              y2={padY + plotH * t}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}
          <path d={areaPath} fill={`url(#${chartId}-fill)`} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((c, i) =>
            i < values.length ? (
              <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#0B0B0F" stroke={stroke} strokeWidth="2" />
            ) : null,
          )}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-white/60">
        <span>{String(safePoints[0]?.[dateKey])}</span>
        <span>{String(safePoints[safePoints.length - 1]?.[dateKey])}</span>
      </div>
    </AdminCard>
  )
}

export const SparklineChart = memo(SparklineChartInner)

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
  { href: "/admin/issues", label: "Issues", icon: "support" as AdminNavIconKey, badgeKey: null },
  { href: "/admin/customers", label: "Customers", icon: "customers" as AdminNavIconKey, badgeKey: null },
  { href: "/admin/beta-users", label: "Beta Users", icon: "betaUsers" as AdminNavIconKey, badgeKey: null },
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
  onNavigate,
}: {
  href: string
  label: string
  icon: AdminNavIconKey
  exact?: boolean
  pathname: string
  badge?: number
  onNavigate?: () => void
}) {
  const active = exact ? pathname === href : pathname.startsWith(href)
  const Icon = ADMIN_ICON_MAP[icon]

  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={`group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition duration-200 ${
        active
          ? "bg-violet-500/12 text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.15)] ring-1 ring-violet-400/25"
          : "text-white/65 hover:bg-white/[0.055] hover:text-white/90"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
          active ? "bg-violet-500/20 text-violet-200" : "bg-white/[0.06] text-white/50 group-hover:text-white/80"
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
