"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import type { AdminSupportPriority, AdminSupportRow, AdminSupportStatus } from "../../../lib/adminTypes"
import { ADMIN_SUPPORT_PRIORITIES, ADMIN_SUPPORT_STATUSES } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  formatAdminDate,
  PriorityBadge,
  SupportStatusBadge,
} from "../../components/admin/admin-shared"

export default function AdminSupportPage() {
  const [rows, setRows] = useState<AdminSupportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminSupportStatus | "">("")
  const [priorityFilter, setPriorityFilter] = useState<AdminSupportPriority | "">("")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/support", { cache: "no-store" })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Could not load inbox")
      return
    }
    setRows(json?.rows ?? [])
    setError(null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (priorityFilter && r.priority !== priorityFilter) return false
      if (!q) return true
      const hay = [r.email, r.name, r.subject, r.message, r.admin_notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter, priorityFilter])

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
        subtitle="Tickets with status workflow, priority, and internal notes."
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

      {showForm ? (
        <form
          onSubmit={onCreate}
          className="mb-6 grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-2"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
          />
          <input
            name="name"
            type="text"
            placeholder="Name"
            className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
          />
          <input
            name="subject"
            type="text"
            placeholder="Subject"
            className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white sm:col-span-2"
          />
          <select
            name="priority"
            defaultValue="medium"
            className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
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
            className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white sm:col-span-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
          >
            {saving ? "Saving…" : "Add ticket"}
          </button>
        </form>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Email, subject, message…" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdminSupportStatus | "")}
          className="rounded-xl border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {ADMIN_SUPPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as AdminSupportPriority | "")}
          className="rounded-xl border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
        >
          <option value="">All priorities</option>
          {ADMIN_SUPPORT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No support tickets match your filters." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/support/${r.id}`}
                    className="font-medium text-white hover:text-violet-200"
                  >
                    {r.subject ?? "(No subject)"}
                  </Link>
                  <p className="text-xs text-white/50">
                    {r.email}
                    {r.name ? ` · ${r.name}` : ""}
                  </p>
                  <p className="mt-1 text-[10px] text-white/40">
                    Created {formatAdminDate(r.created_at)}
                    {r.updated_at !== r.created_at ? ` · Updated ${formatAdminDate(r.updated_at)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={r.priority} />
                  <SupportStatusBadge status={r.status} />
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-white/72">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
