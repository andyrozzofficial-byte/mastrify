"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { AdminFeedbackRow, AdminFeedbackStatus } from "../../../lib/adminTypes"
import { ADMIN_FEEDBACK_STATUSES } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  FeedbackStatusBadge,
  FeedbackStatusSelect,
  formatAdminDate,
} from "../../components/admin/admin-shared"

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<AdminFeedbackRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminFeedbackStatus | "">("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/feedback", { cache: "no-store" })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Could not load feedback")
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
      const hay = [r.track_name, r.genre, r.session_id, r.contact_email, r.mastering_style]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter])

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null

  async function patchItem(id: string, patch: { status?: AdminFeedbackStatus; admin_notes?: string | null }) {
    setSaving(true)
    const res = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
    setSaving(false)
    if (res.ok) void load()
  }

  return (
    <div>
      <AdminPageHeader title="Feedback" subtitle="Beta survey submissions with status workflow." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Track, genre, email, session…" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdminFeedbackStatus | "")}
          className="rounded-xl border border-white/[0.08] bg-[#090912] px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {ADMIN_FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No feedback matches your filters." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-white/[0.03] text-white/50">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Track</th>
                  <th className="px-3 py-2.5">Genre</th>
                  <th className="px-3 py-2.5">Rec.</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer border-t border-white/[0.05] hover:bg-white/[0.03] ${
                      selected?.id === r.id ? "bg-violet-500/10" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-white/70">{formatAdminDate(r.created_at)}</td>
                    <td className="max-w-[8rem] truncate px-3 py-2">{r.track_name ?? "—"}</td>
                    <td className="px-3 py-2">{r.genre}</td>
                    <td className="px-3 py-2 tabular-nums text-cyan-300/85">{r.recommend_score}</td>
                    <td className="px-3 py-2">
                      <FeedbackStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected ? (
            <aside className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="text-sm font-semibold text-white">Details</h3>
              <dl className="mt-3 space-y-2 text-xs text-white/70">
                <div>
                  <dt className="text-white/45">Style</dt>
                  <dd>{selected.mastering_style ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Release-ready</dt>
                  <dd>{selected.release_ready}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Email</dt>
                  <dd>{selected.contact_email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Session</dt>
                  <dd className="font-mono text-[10px]">{selected.session_id ?? "—"}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Status</p>
                <FeedbackStatusSelect
                  value={selected.status}
                  disabled={saving}
                  onChange={(status) => patchItem(selected.id, { status })}
                />
              </div>
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Admin notes</p>
                <textarea
                  defaultValue={selected.admin_notes ?? ""}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1.5 text-xs text-white"
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v !== (selected.admin_notes ?? "")) {
                      patchItem(selected.id, { admin_notes: v || null })
                    }
                  }}
                />
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  )
}
