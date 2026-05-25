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
  critical: "border-rose-300 bg-rose-50/90 text-rose-950",
  medium: "border-amber-300 bg-amber-50/90 text-amber-950",
  positive: "border-emerald-300 bg-emerald-50/90 text-emerald-950",
}

const PRIORITY_STYLES: Record<ActionCenterIssue["priorityLabel"], string> = {
  High: "bg-rose-100 text-rose-800 ring-rose-200",
  Medium: "bg-amber-100 text-amber-900 ring-amber-200",
  Low: "bg-slate-100 text-slate-700 ring-slate-200",
}

const DISPOSITION_LABEL: Record<ActionCenterDisposition, string> = {
  fixed: "Marked fixed",
  ignored: "Ignored",
  tracked: "Tracking",
}

export function AdminActionCenter({ items }: { items: ActionCenterIssue[] }) {
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
    <AdminCard className="mb-8 border-violet-300/70 bg-gradient-to-br from-[#ffffff] to-violet-50/50">
      <h2 className="text-lg font-semibold text-slate-950">Action center</h2>
      <p className="mt-1 text-sm text-slate-600">
        Prioritized patterns from beta feedback — priority = mentions × recommend impact.
      </p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">All issues are ignored or resolved. Clear ignores in browser storage to reset.</p>
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
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                          {DISPOSITION_LABEL[disposition]}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[13px] text-slate-700">
                      {item.mentions} mention{item.mentions === 1 ? "" : "s"} · score {item.priorityScore}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDisposition(item.id, "fixed")}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:text-emerald-800"
                    >
                      Mark fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisposition(item.id, "ignored")}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-400"
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
                          ? "border-violet-400 bg-violet-100 text-violet-800"
                          : "border-slate-300 bg-white text-violet-700 hover:border-violet-300"
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
