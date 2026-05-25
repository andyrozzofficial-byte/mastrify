"use client"

import type { ActionCenterItem } from "../../../lib/adminFeedbackActionCenter"
import { AdminCard } from "./admin-shared"

const TONE_STYLES = {
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  medium: "border-amber-200 bg-amber-50 text-amber-950",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
}

export function AdminActionCenter({ items }: { items: ActionCenterItem[] }) {
  if (items.length === 0) return null

  return (
    <AdminCard className="mb-8 border-violet-200/60 bg-gradient-to-br from-white to-violet-50/40">
      <h2 className="text-lg font-semibold text-slate-900">Action center</h2>
      <p className="mt-1 text-sm text-slate-600">Prioritized signals from beta feedback — what to fix first.</p>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li
            key={item.message}
            className={`rounded-xl border px-4 py-3 text-[14px] leading-relaxed ${TONE_STYLES[item.tier]}`}
          >
            <span className="mr-2" aria-hidden>
              {item.emoji}
            </span>
            {item.message}
          </li>
        ))}
      </ul>
    </AdminCard>
  )
}
