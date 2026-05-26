"use client"

import type { RankedIssue } from "../../../lib/adminFeedbackActionCenter"
import { AdminCard } from "./admin-shared"

function TierColumn({
  title,
  emoji,
  items,
  empty,
  barClass,
}: {
  title: string
  emoji: string
  items: RankedIssue[]
  empty: string
  barClass: string
}) {
  return (
    <AdminCard className="flex flex-col">
      <h3 className="text-[15px] font-semibold text-white">
        {emoji} {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-white/60">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {(items ?? []).slice(0, 8).map((item) => {
            const max = items[0]?.count ?? 1
            return (
              <li key={item.label}>
                <div className="flex justify-between gap-2 text-[13px] text-white/60">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-white">
                    {item.count} {item.count === 1 ? "user" : "users"}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${barClass}`}
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </AdminCard>
  )
}

export function IssuePrioritizationPanel({
  critical,
  medium,
  positive,
}: {
  critical: RankedIssue[]
  medium: RankedIssue[]
  positive: RankedIssue[]
}) {
  return (
    <div className="mb-10 grid gap-4 lg:grid-cols-3">
      <TierColumn
        title="Critical issues"
        emoji="🔴"
        items={critical}
        empty="No critical patterns yet"
        barClass="bg-rose-500"
      />
      <TierColumn
        title="Medium issues"
        emoji="🟡"
        items={medium}
        empty="No medium patterns yet"
        barClass="bg-violet-500"
      />
      <TierColumn
        title="Positive trends"
        emoji="🟢"
        items={positive}
        empty="No positive trends yet"
        barClass="bg-emerald-500"
      />
    </div>
  )
}
