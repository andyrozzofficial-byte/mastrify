"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ActionCenterIssue } from "../../../lib/adminFeedbackActionCenter"
import {
  clearActionCenterDisposition,
  getActionCenterDispositions,
  setActionCenterDisposition,
  type ActionCenterDisposition,
} from "../../../lib/adminActionCenterPrefs"
import { AdminCard } from "./admin-shared"

const TONE_STYLES = {
  critical: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  medium: "border-violet-400/30 bg-violet-500/10 text-violet-100",
  positive: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
}

const PRIORITY_STYLES: Record<ActionCenterIssue["priorityLabel"], string> = {
  High: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
  Medium: "bg-violet-500/15 text-violet-200 ring-violet-400/25",
  Low: "bg-white/[0.06] text-white/55 ring-white/10",
}

const DISPOSITION_LABEL: Record<ActionCenterDisposition, string> = {
  fixed: "Marked fixed",
  ignored: "Ignored",
  tracked: "Tracking",
}

export function AdminActionCenter({
  items,
  subtitle = "Prioritized signals from beta feedback and support tickets — what to fix first.",
}: {
  items: ActionCenterIssue[]
  subtitle?: string
}) {
  const [dispositions, setDispositions] = useState<Record<string, ActionCenterDisposition>>({})

  const refresh = useCallback(() => {
    setDispositions(getActionCenterDispositions())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, items])

  const visible = useMemo(
    () => items.filter((item) => dispositions[item.id] !== "ignored"),
    [items, dispositions],
  )

  const setDisposition = (issueId: string, disposition: ActionCenterDisposition) => {
    setActionCenterDisposition(issueId, disposition)
    refresh()
  }

  if (items.length === 0) return null

  return (
    <AdminCard className="mb-8 border-violet-400/25 bg-gradient-to-br from-white/[0.03] to-violet-500/10">
      <h2 className="text-lg font-semibold text-white">Action center</h2>
      <p className="mt-1 text-sm text-white/60">{subtitle}</p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">All issues are ignored or resolved. Clear ignores in browser storage to reset.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((item) => {
            const disposition = dispositions[item.id]
            return (
              <li
                key={item.id}
                className={`rounded-xl border px-4 py-3.5 ${TONE_STYLES[item.tier]} ${disposition === "fixed" ? "opacity-75" : ""}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span aria-hidden>{item.emoji}</span>
                      <span className="text-[15px] font-semibold">{item.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${PRIORITY_STYLES[item.priorityLabel]}`}
                      >
                        {item.priorityLabel} priority
                      </span>
                      {disposition ? (
                        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-white/60 ring-1 ring-white/10">
                          {DISPOSITION_LABEL[disposition]}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[13px] text-white/60">
                      {item.mentions} mention{item.mentions === 1 ? "" : "s"} · score {item.priorityScore}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDisposition(item.id, "fixed")}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-emerald-400/40 hover:text-emerald-200"
                    >
                      Mark fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisposition(item.id, "ignored")}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-white/60 transition hover:border-white/20"
                    >
                      Ignore
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (disposition === "tracked") clearActionCenterDisposition(item.id)
                        else setDisposition(item.id, "tracked")
                        refresh()
                      }}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm transition ${
                        disposition === "tracked"
                          ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
                          : "border-white/[0.08] bg-white/[0.03] text-violet-200 hover:border-violet-400/40"
                      }`}
                    >
                      Track issue
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </AdminCard>
  )
}
