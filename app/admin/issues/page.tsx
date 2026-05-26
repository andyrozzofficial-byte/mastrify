"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { BetaIssuePriority, BetaIssueStatus, BetaReportedIssueRow } from "../../../lib/betaIssueTypes"
import {
  BETA_ISSUE_PRIORITIES,
  BETA_ISSUE_PRIORITY_LABELS,
  BETA_ISSUE_STATUSES,
  BETA_ISSUE_STATUS_LABELS,
} from "../../../lib/betaIssueTypes"
import {
  AdminCard,
  AdminEmpty,
  AdminPageHeader,
  AdminSearchInput,
  AdminSelect,
  formatAdminDate,
  PriorityBadge,
} from "../../components/admin/admin-shared"

type SortOrder = "newest" | "oldest"

function StatusBadge({ status }: { status: BetaIssueStatus }) {
  const styles: Record<BetaIssueStatus, string> = {
    open: "border-amber-400/30 bg-amber-500/10 text-amber-100/90",
    in_progress: "border-sky-400/30 bg-sky-500/10 text-sky-100/90",
    fixed: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90",
    closed: "border-white/15 bg-white/[0.06] text-white/55",
  }
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {BETA_ISSUE_STATUS_LABELS[status]}
    </span>
  )
}

export default function AdminIssuesPage() {
  const [rows, setRows] = useState<BetaReportedIssueRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<BetaIssueStatus | "">("")
  const [priorityFilter, setPriorityFilter] = useState<BetaIssuePriority | "">("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/issues", { cache: "no-store" })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Could not load issues")
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
    const list = rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (priorityFilter && r.priority !== priorityFilter) return false
      if (!q) return true
      const hay = [r.title, r.description, r.user_id, r.expected_result]
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
  }, [rows, search, statusFilter, priorityFilter, sortOrder])

  async function updateStatus(id: string, status: BetaIssueStatus) {
    setUpdatingId(id)
    const res = await fetch(`/api/admin/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setUpdatingId(null)
    if (res.ok) void load()
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reported issues"
        subtitle="Beta Report Issue submissions — title, user, priority, and workflow status."
      />

      {error ? (
        <AdminCard>
          <p className="text-sm text-rose-300/90">{error}</p>
        </AdminCard>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search issues…" className="lg:max-w-xs" />
        <AdminSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as BetaIssueStatus | "")}
          options={[
            { value: "", label: "All statuses" },
            ...BETA_ISSUE_STATUSES.map((s) => ({ value: s, label: BETA_ISSUE_STATUS_LABELS[s] })),
          ]}
        />
        <AdminSelect
          label="Priority"
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as BetaIssuePriority | "")}
          options={[
            { value: "", label: "All priorities" },
            ...BETA_ISSUE_PRIORITIES.map((p) => ({ value: p, label: BETA_ISSUE_PRIORITY_LABELS[p] })),
          ]}
        />
        <AdminSelect
          label="Sort"
          value={sortOrder}
          onChange={(v) => setSortOrder(v as SortOrder)}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty message={rows.length === 0 ? "No reported issues yet." : "No issues match your filters."} />
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <AdminCard key={row.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white/92">{row.title}</p>
                  <p className="mt-1 text-[12px] text-white/50">
                    {row.user_id} · {formatAdminDate(row.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={row.priority} />
                  <StatusBadge status={row.status} />
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-white/72 whitespace-pre-wrap">{row.description}</p>
              {row.expected_result ? (
                <p className="text-[12px] leading-relaxed text-white/55">
                  <span className="font-medium text-white/65">Expected: </span>
                  {row.expected_result}
                </p>
              ) : null}
              {row.screenshot_url ? (
                <a
                  href={row.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[12px] font-medium text-violet-300/90 hover:underline"
                >
                  View screenshot
                </a>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                {BETA_ISSUE_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={updatingId === row.id || row.status === status}
                    onClick={() => void updateStatus(row.id, status)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                      row.status === status
                        ? "border-violet-400/35 bg-violet-500/15 text-violet-100"
                        : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    {BETA_ISSUE_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  )
}
