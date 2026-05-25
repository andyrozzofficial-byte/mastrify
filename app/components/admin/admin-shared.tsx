"use client"

import Link from "next/link"
import type { AdminItemStatus } from "../../../lib/adminTypes"
import { ADMIN_ITEM_STATUSES } from "../../../lib/adminTypes"

export function formatAdminDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

const STATUS_STYLES: Record<AdminItemStatus, string> = {
  new: "bg-violet-500/20 text-violet-200 ring-violet-400/30",
  read: "bg-sky-500/15 text-sky-200 ring-sky-400/25",
  resolved: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25",
}

export function StatusBadge({ status }: { status: AdminItemStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}

export function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: AdminItemStatus
  onChange: (s: AdminItemStatus) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AdminItemStatus)}
      className="rounded-lg border border-white/[0.1] bg-[#090912] px-2.5 py-1.5 text-xs text-white"
    >
      {ADMIN_ITEM_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
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

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/analytics", label: "Analytics" },
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
