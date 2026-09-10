"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { BetaUserListRow } from "../../../lib/adminTypes"
import {
  AdminEmpty,
  AdminMobileCard,
  AdminMobileCardList,
  AdminMobileField,
  AdminPageHeader,
  AdminSearchInput,
  AdminTable,
  AvatarCircle,
  BetaRankBadge,
} from "../../components/admin/admin-shared"
import { BetaEngagementBadge } from "../../components/admin/BetaEngagementBadge"

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
      const loaded = (json?.rows ?? []) as BetaUserListRow[]
      if (process.env.NODE_ENV === "development" && loaded.length > 0) {
        const sample = loaded[0]
        console.log("[admin] beta-users row sample", {
          email: sample.email,
          betaPoints: sample.betaPoints,
          masterCount: sample.masterCount,
          feedbackCount: sample.feedbackCount,
          supportCount: sample.supportCount,
        })
      }
      setRows(loaded)
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
        <>
          <AdminTable>
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-[11px] font-medium uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Beta user</th>
                <th className="px-3 py-2.5">Rank</th>
                <th className="px-3 py-2.5">Points</th>
                <th className="px-3 py-2.5">Masters</th>
                <th className="px-3 py-2.5">Feedback</th>
                <th className="px-3 py-2.5">Support</th>
                <th className="px-3 py-2.5">Engagement</th>
                <th className="px-3 py-2.5">Recommend</th>
                <th className="px-3 py-2.5">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email} className="border-t border-white/[0.06] transition hover:bg-white/[0.04]">
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
                  <td className="px-3 py-2.5">
                    <BetaRankBadge rank={r.betaRank} />
                  </td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{r.betaPoints}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{r.masterCount}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{r.feedbackCount}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">{r.supportCount}</td>
                  <td className="px-3 py-2.5">
                    <BetaEngagementBadge level={r.engagementLevel} score={r.engagementScore} />
                  </td>
                  <td className="px-3 py-2.5 text-sm tabular-nums text-white/80">
                    {r.avgRecommend != null ? r.avgRecommend.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-white/60">{r.lastActivity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <AdminMobileCardList>
            {filtered.map((r) => (
              <AdminMobileCard key={r.email}>
                <Link
                  href={`/admin/beta-users/${encodeURIComponent(r.email)}`}
                  className="flex min-h-[44px] items-center gap-3"
                >
                  <AvatarCircle email={r.email} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{r.name ?? r.email}</p>
                    <p className="truncate text-xs text-white/45">{r.email}</p>
                  </div>
                </Link>
                <AdminMobileField label="Rank">
                  <BetaRankBadge rank={r.betaRank} />
                </AdminMobileField>
                <AdminMobileField label="Points">{r.betaPoints}</AdminMobileField>
                <AdminMobileField label="Masters">{r.masterCount}</AdminMobileField>
                <AdminMobileField label="Feedback">{r.feedbackCount}</AdminMobileField>
                <AdminMobileField label="Support">{r.supportCount}</AdminMobileField>
                <AdminMobileField label="Engagement">
                  <BetaEngagementBadge level={r.engagementLevel} score={r.engagementScore} />
                </AdminMobileField>
                <AdminMobileField label="Recommend">
                  {r.avgRecommend != null ? r.avgRecommend.toFixed(1) : "—"}
                </AdminMobileField>
                <AdminMobileField label="Last active">{r.lastActivity ?? "—"}</AdminMobileField>
              </AdminMobileCard>
            ))}
          </AdminMobileCardList>
        </>
      )}
    </div>
  )
}
