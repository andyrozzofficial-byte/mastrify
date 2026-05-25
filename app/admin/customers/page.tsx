"use client"

import Link from "next/link"
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
  const [purchasedOnly, setPurchasedOnly] = useState(false)

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
    return rows.filter((r) => {
      if (purchasedOnly && !r.purchased) return false
      if (!q) return true
      return r.email.includes(q) || (r.name ?? "").toLowerCase().includes(q)
    })
  }, [rows, search, purchasedOnly])

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        subtitle="Profiles from feedback, support, and export deliveries."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search by email or name…" />
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={purchasedOnly}
            onChange={(e) => setPurchasedOnly(e.target.checked)}
            className="rounded border-white/20"
          />
          Purchased only
        </label>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No customer records with email yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-white/[0.03] text-white/50">
              <tr>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Purchased</th>
                <th className="px-3 py-2.5">Feedback</th>
                <th className="px-3 py-2.5">Exports</th>
                <th className="px-3 py-2.5">Support</th>
                <th className="px-3 py-2.5">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(r.email)}`}
                      className="text-violet-200/90 hover:text-violet-100"
                    >
                      {r.email}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{r.purchased ? "Yes" : "No"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.feedbackCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.exportCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.supportCount}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/60">
                    {formatAdminDate(r.lastActivity)}
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
