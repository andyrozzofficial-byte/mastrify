"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { AdminCustomerRow } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileField,
  AdminPageHeader,
  AdminSearchInput,
  AdminTable,
  AvatarCircle,
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
        <>
          <AdminTable>
            <thead className="border-b border-white/[0.06] bg-[#141416] text-[11px] font-medium uppercase tracking-wide text-white/42">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-3 py-2.5">Purchased</th>
                <th className="px-3 py-2.5">Feedback</th>
                <th className="px-3 py-2.5">Exports</th>
                <th className="px-3 py-2.5">Support</th>
                <th className="px-3 py-2.5">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email} className="border-t border-white/[0.05] transition hover:bg-[#1f1f23]/80">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(r.email)}`}
                      className="flex items-center gap-3 hover:text-violet-200"
                    >
                      <AvatarCircle email={r.email} size="sm" />
                      <span className="text-[13px] font-medium text-white/88">{r.email}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-[13px]">
                    {r.purchased ? (
                      <span className="text-emerald-300/90">Purchased</span>
                    ) : (
                      <span className="text-white/42">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{r.feedbackCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.exportCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.supportCount}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/60">
                    {formatAdminDate(r.lastActivity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <AdminMobileCardList>
            {filtered.map((r) => (
              <AdminMobileCard key={r.email}>
                <Link
                  href={`/admin/customers/${encodeURIComponent(r.email)}`}
                  className="flex min-h-[44px] items-center gap-3"
                >
                  <AvatarCircle email={r.email} size="sm" />
                  <span className="min-w-0 truncate text-[13px] font-medium text-white">{r.email}</span>
                </Link>
                <AdminMobileField label="Purchased">
                  {r.purchased ? (
                    <span className="text-emerald-300/90">Yes</span>
                  ) : (
                    <span className="text-white/42">—</span>
                  )}
                </AdminMobileField>
                <AdminMobileField label="Feedback">{r.feedbackCount}</AdminMobileField>
                <AdminMobileField label="Exports">{r.exportCount}</AdminMobileField>
                <AdminMobileField label="Support">{r.supportCount}</AdminMobileField>
                <AdminMobileField label="Last active">{formatAdminDate(r.lastActivity)}</AdminMobileField>
              </AdminMobileCard>
            ))}
          </AdminMobileCardList>
        </>
      )}
    </div>
  )
}
