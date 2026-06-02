"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { categoryLabel, SUPPORT_TICKET_CATEGORIES } from "../../../lib/supportTypes"
import type { AdminSupportPriority, AdminSupportRow, AdminSupportStatus } from "../../../lib/adminTypes"
import {
  ADMIN_SUPPORT_PRIORITIES,
  ADMIN_SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
} from "../../../lib/adminTypes"
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  AdminSelect,
  AvatarCircle,
  formatAdminDate,
  KpiCard,
  PriorityBadge,
  SupportStatusBadge,
} from "../../components/admin/admin-shared"

type SortOrder = "newest" | "oldest"

export default function AdminSupportPage() {
  const [rows, setRows] = useState<AdminSupportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminSupportStatus | "">("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<AdminSupportPriority | "">("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/support", { cache: "no-store" })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Could not load inbox")
      setRows([])
      return
    }
    if (json?.error) {
      setError(String(json.error))
      setRows([])
      return
    }
    setRows(json?.rows ?? [])
    setError(null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const statusCounts = useMemo(() => {
    const open = rows.filter((r) => r.status === "open").length
    const waiting = rows.filter((r) => r.status === "waiting_for_customer").length
    const resolved = rows.filter(
      (r) => r.status === "resolved" || r.status === "closed",
    ).length
    return { open, waiting, resolved }
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (categoryFilter && r.category !== categoryFilter) return false
      if (priorityFilter && r.priority !== priorityFilter) return false
      if (!q) return true
      const hay = [r.email, r.name, r.subject, r.message, r.admin_notes, r.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
    list.sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at)
      return sortOrder === "newest" ? -cmp : cmp
    })
    return list
  }, [rows, search, statusFilter, categoryFilter, priorityFilter, sortOrder])

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaving(true)
    const res = await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        name: fd.get("name"),
        subject: fd.get("subject"),
        message: fd.get("message"),
        priority: fd.get("priority"),
        source: "manual",
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      void load()
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Support"
        subtitle="Tickets with threaded replies, session context, and product signals."
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {showForm ? "Cancel" : "New ticket"}
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          className="text-left"
          onClick={() => setStatusFilter(statusFilter === "open" ? "" : "open")}
        >
          <KpiCard label="Open" value={String(statusCounts.open)} accent="violet" />
        </button>
        <button
          type="button"
          className="text-left"
          onClick={() =>
            setStatusFilter(statusFilter === "waiting_for_customer" ? "" : "waiting_for_customer")
          }
        >
          <KpiCard label="Waiting for user" value={String(statusCounts.waiting)} accent="amber" />
        </button>
        <button
          type="button"
          className="text-left"
          onClick={() => setStatusFilter(statusFilter === "resolved" ? "" : "resolved")}
        >
          <KpiCard label="Resolved" value={String(statusCounts.resolved)} accent="emerald" />
        </button>
      </div>

      {showForm ? (
        <form onSubmit={onCreate} className="mb-6">
          <AdminCard className="!p-5">
            <p className="mb-4 text-sm font-medium text-slate-900">New ticket</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="email"
                type="email"
                required
                placeholder="Email"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
              <input
                name="name"
                type="text"
                placeholder="Name"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
              <input
                name="subject"
                type="text"
                placeholder="Subject"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 sm:col-span-2"
              />
              <select
                name="priority"
                defaultValue="medium"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                {ADMIN_SUPPORT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <textarea
                name="message"
                required
                rows={3}
                placeholder="Message"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 sm:col-span-2"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 sm:col-span-2"
              >
                {saving ? "Saving…" : "Add ticket"}
              </button>
            </div>
          </AdminCard>
        </form>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search tickets…" />
        <AdminSelect value={statusFilter} onChange={(v) => setStatusFilter(v as AdminSupportStatus | "")}>
          <option value="">All statuses</option>
          {ADMIN_SUPPORT_STATUSES.filter((s) => s !== "closed").map((s) => (
            <option key={s} value={s}>
              {SUPPORT_STATUS_LABELS[s]}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect value={categoryFilter} onChange={setCategoryFilter}>
          <option value="">All categories</option>
          {SUPPORT_TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as AdminSupportPriority | "")}
        >
          <option value="">All priorities</option>
          {ADMIN_SUPPORT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect value={sortOrder} onChange={(v) => setSortOrder(v as SortOrder)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </AdminSelect>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No support tickets match your filters." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <AdminCard hover className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <AvatarCircle email={r.email} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/support/${r.id}`}
                        className="text-[15px] font-medium text-slate-900 hover:text-violet-700"
                      >
                        {r.subject ?? "(No subject)"}
                      </Link>
                      <p className="text-xs text-slate-600">
                        <Link
                          href={`/admin/customers/${encodeURIComponent(r.email)}`}
                          className="hover:text-violet-700"
                        >
                          {r.email}
                        </Link>
                        {r.category ? ` · ${categoryLabel(r.category)}` : ""}
                        {r.name ? ` · ${r.name}` : ""}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Created {formatAdminDate(r.created_at)}
                        {r.updated_at !== r.created_at
                          ? ` · Updated ${formatAdminDate(r.updated_at)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={r.priority} />
                    <SupportStatusBadge status={r.status} />
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                  {r.thread[0]?.body ?? r.message}
                </p>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
