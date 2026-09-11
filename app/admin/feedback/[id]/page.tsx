"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { AdminFeedbackRow, AdminFeedbackStatus } from "../../../../lib/adminTypes"
import { FeedbackSurveyDetail } from "../../../components/admin/FeedbackSurveyDetail"
import { AdminPageHeader } from "../../../components/admin/admin-shared"

export default function AdminFeedbackDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const [row, setRow] = useState<AdminFeedbackRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/feedback/${id}`, { cache: "no-store" })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Feedback not found")
      return
    }
    setRow(json.row as AdminFeedbackRow)
    setError(null)
  }, [id])

  useEffect(() => {
    if (id) void load()
  }, [id, load])

  async function patchItem(patch: { status?: AdminFeedbackStatus; admin_notes?: string | null }) {
    setSaving(true)
    const res = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
    setSaving(false)
    if (res.ok) void load()
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-rose-300/90">{error}</p>
        <Link href="/admin/feedback" className="mt-4 inline-block text-sm text-violet-300/90 hover:text-violet-200">
          ← Back to feedback
        </Link>
      </div>
    )
  }

  if (!row) return <p className="text-sm text-white/50">Loading survey…</p>

  return (
    <div>
      <AdminPageHeader
        title={row.track_name ?? "Survey detail"}
        subtitle={`${row.genre} · submitted ${new Date(row.created_at).toLocaleString()}`}
        actions={
          <Link
            href="/admin/feedback"
            className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10"
          >
            ← All feedback
          </Link>
        }
      />

      <FeedbackSurveyDetail
        row={row}
        saving={saving}
        onStatusChange={(status) => patchItem({ status })}
        onNotesBlur={(admin_notes) => patchItem({ admin_notes })}
      />
    </div>
  )
}
