"use client"

import { useEffect, useMemo, useState } from "react"
import type { AdminJobRow, AdminJobStatus } from "../../../lib/adminTypes"
import { ADMIN_JOB_STATUSES } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileField,
  AdminPageHeader,
  AdminSearchInput,
  AdminSelect,
  AdminTable,
  formatAdminDate,
  JobStatusBadge,
} from "../../components/admin/admin-shared"

function formatDuration(ms: number | null) {
  if (ms == null || !Number.isFinite(ms)) return "—"
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export default function AdminJobsPage() {
  const [rows, setRows] = useState<AdminJobRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminJobStatus | "">("")

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/jobs", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not load jobs")
        return
      }
      setRows(json?.rows ?? [])
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (!q) return true
      const hay = [r.track_name, r.session_id, r.user_email, r.mastering_style, r.error_log]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter])

  return (
    <div>
      <AdminPageHeader
        title="Master Jobs"
        subtitle="Processing pipeline — synced from feedback and job records."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Track, session, email…" />
        <AdminSelect value={statusFilter} onChange={(v) => setStatusFilter(v as AdminJobStatus | "")}>
          <option value="">All statuses</option>
          {ADMIN_JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </AdminSelect>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No master jobs found." />
      ) : (
        <>
          <AdminTable>
            <thead className="border-b border-white/[0.06] bg-[#141416] text-[11px] font-medium uppercase tracking-wide text-white/42">
              <tr>
                <th className="px-3 py-2.5">Track</th>
                <th className="px-3 py-2.5">Session / user</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Duration</th>
                <th className="px-3 py-2.5">Style</th>
                <th className="px-3 py-2.5">LUFS</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5">Errors</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.05] align-top transition hover:bg-[#1f1f23]/80">
                  <td className="px-4 py-3.5 text-[13px] text-white/88">{r.track_name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-white/60">
                    <p className="font-mono text-[10px]">{r.session_id ?? "—"}</p>
                    <p className="mt-0.5">{r.user_email ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <JobStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{formatDuration(r.processing_time_ms)}</td>
                  <td className="px-3 py-2.5">{r.mastering_style ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.master_lufs ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/60">
                    {formatAdminDate(r.created_at)}
                  </td>
                  <td className="max-w-[12rem] px-3 py-2.5 text-rose-300/80">
                    {r.error_log ? (
                      <span className="line-clamp-3 font-mono text-[10px]">{r.error_log}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <AdminMobileCardList>
            {filtered.map((r) => (
              <AdminMobileCard key={r.id}>
                <p className="text-[15px] font-semibold text-white">{r.track_name ?? "Untitled"}</p>
                <AdminMobileField label="Status">
                  <JobStatusBadge status={r.status} />
                </AdminMobileField>
                <AdminMobileField label="User">{r.user_email ?? "—"}</AdminMobileField>
                <AdminMobileField label="Duration">{formatDuration(r.processing_time_ms)}</AdminMobileField>
                <AdminMobileField label="Style">{r.mastering_style ?? "—"}</AdminMobileField>
                <AdminMobileField label="LUFS">{r.master_lufs ?? "—"}</AdminMobileField>
                <AdminMobileField label="Created">{formatAdminDate(r.created_at)}</AdminMobileField>
                {r.error_log ? (
                  <AdminMobileField label="Errors">
                    <span className="line-clamp-2 break-all font-mono text-[10px] text-rose-300/90">
                      {r.error_log}
                    </span>
                  </AdminMobileField>
                ) : null}
              </AdminMobileCard>
            ))}
          </AdminMobileCardList>
        </>
      )}
    </div>
  )
}
