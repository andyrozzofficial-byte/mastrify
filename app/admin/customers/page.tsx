"use client"

import { useEffect, useMemo, useState } from "react"
import type { AdminCustomerRow } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  formatAdminDate,
} from "../../components/admin/admin-shared"

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<AdminCustomerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/customers", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not load customers")
        return
      }
      setRows(json?.rows ?? [])
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.email.includes(q) || (r.name ?? "").toLowerCase().includes(q))
  }, [rows, search])

  return (
    <div>
      <AdminPageHeader
        title="Customer history"
        subtitle="Contacts grouped by email from feedback and support."
      />

      <div className="mb-4">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search by email or name…" />
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No customer records with email yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-white/[0.03] text-white/50">
              <tr>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Feedback</th>
                <th className="px-3 py-2.5">Support</th>
                <th className="px-3 py-2.5">Last active</th>
                <th className="px-3 py-2.5">Last track</th>
                <th className="px-3 py-2.5">Avg rec.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 text-white/85">{r.email}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.feedbackCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.supportCount}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/60">
                    {formatAdminDate(r.lastActivity)}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2.5">{r.lastTrack ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums text-cyan-300/85">
                    {r.avgRecommend ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
