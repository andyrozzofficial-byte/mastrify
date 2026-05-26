"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { BetaUserListRow } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  AdminTable,
  AvatarCircle,
} from "../../components/admin/admin-shared"

export default function AdminBetaUsersPage() {
  const [rows, setRows] = useState<BetaUserListRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/beta-users", { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? "Could not load beta users")
        return
      }
      setRows(json?.rows ?? [])
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.email.includes(q) ||
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.genre ?? "").toLowerCase().includes(q) ||
        (r.daw ?? "").toLowerCase().includes(q),
    )
  }, [rows, search])

  return (
    <div>
      <AdminPageHeader
        title="Beta Users"
        subtitle="Profiles linked to feedback surveys, support, and mastering activity — no duplicate tracking."
      />

      <div className="mb-4">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search by name, email, genre, DAW…" />
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300/90">{error}</p> : null}

      {filtered.length === 0 ? (
        <AdminEmpty message="No beta users with linked email activity yet." />
      ) : (
        <AdminTable>
          <thead className="border-b border-white/[0.06] bg-[#141416] text-[11px] font-medium uppercase tracking-wide text-white/42">
            <tr>
              <th className="px-4 py-3">Beta user</th>
              <th className="px-3 py-2.5">Rank</th>
              <th className="px-3 py-2.5">Masters</th>
              <th className="px-3 py-2.5">Feedback</th>
              <th className="px-3 py-2.5">Support</th>
              <th className="px-3 py-2.5">Recommend</th>
              <th className="px-3 py-2.5">Last active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.email} className="border-t border-white/[0.05] transition hover:bg-[#1f1f23]/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/beta-users/${encodeURIComponent(r.email)}`}
                    className="flex items-center gap-3"
                  >
                    <AvatarCircle email={r.email} size="sm" />
                    <div>
                      <p className="font-medium text-white">{r.name ?? r.email}</p>
                      <p className="text-xs text-white/45">{r.email}</p>
                      {r.genre || r.daw ? (
                        <p className="mt-0.5 text-[11px] text-white/38">
                          {[r.genre, r.daw].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-sm text-white/70">{r.betaRank}</td>
                <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{r.masterCount}</td>
                <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{r.feedbackCount}</td>
                <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{r.supportCount}</td>
                <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">
                  {r.avgRecommend != null ? r.avgRecommend.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2.5 text-sm text-white/60">{r.lastActivity ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  )
}
