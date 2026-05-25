"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import type { AdminItemStatus, AdminSupportRow } from "../../../lib/adminTypes"
import { ADMIN_ITEM_STATUSES } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  formatAdminDate,
  StatusBadge,
  StatusSelect,
} from "../../components/admin/admin-shared"

export default function AdminSupportPage() {
  const [rows, setRows] = useState<AdminSupportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminItemStatus | "">("")
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
      if (!q) return true
      const hay = [r.email, r.name, r.subject, r.message].filter(Boolean).join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter])

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
        source: "manual",
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      void load()
    }
  }

  async function patchStatus(id: string, status: AdminItemStatus) {
    setSaving(true)
    await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    setSaving(false)
    void load()
  }

  return (
    <div>
      <AdminPageHeader
        title="Support inbox"
        subtitle="Customer messages and internal tickets."
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
            {saving ? "Saving…" : "Add to inbox"}
          </button>
        </form>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Email, subject, message…" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdminItemStatus | "")}
          className="rounded-xl border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {ADMIN_ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No support tickets yet." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{r.subject ?? "(No subject)"}</p>
                  <p className="text-xs text-white/50">
                    {r.email}
                    {r.name ? ` · ${r.name}` : ""} · {formatAdminDate(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <StatusSelect
                    value={r.status}
                    disabled={saving}
                    onChange={(status) => patchStatus(r.id, status)}
                  />
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/72">{r.message}</p>
              {r.admin_notes ? (
                <p className="mt-2 text-xs text-white/45">Notes: {r.admin_notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
