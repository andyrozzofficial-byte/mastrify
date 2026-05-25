"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { AdminSupportPriority, AdminSupportRow, AdminSupportStatus } from "../../../../lib/adminTypes"
import {
  AdminPageHeader,
  formatAdminDate,
  PriorityBadge,
  PrioritySelect,
  SupportStatusBadge,
  SupportStatusSelect,
} from "../../../components/admin/admin-shared"

export default function AdminSupportTicketPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const [ticket, setTicket] = useState<AdminSupportRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/support/${id}`, { cache: "no-store" })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Ticket not found")
      return
    }
    const t = json.ticket as AdminSupportRow
    setTicket(t)
    setNotes(t.admin_notes ?? "")
    setError(null)
  }, [id])

  useEffect(() => {
    if (id) void load()
  }, [id, load])

  async function patch(patch: {
    status?: AdminSupportStatus
    priority?: AdminSupportPriority
    admin_notes?: string | null
  }) {
    setSaving(true)
    const res = await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
    setSaving(false)
    if (res.ok) void load()
  }

  if (error) return <p className="text-sm text-rose-300/90">{error}</p>
  if (!ticket) return <p className="text-sm text-white/50">Loading ticket…</p>

  return (
    <div>
      <AdminPageHeader
        title={ticket.subject ?? "Support ticket"}
        subtitle={ticket.email}
        actions={
          <Link href="/admin/support" className="text-xs text-violet-300/80 hover:text-violet-200">
            ← Back to inbox
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <SupportStatusSelect
          value={ticket.status}
          disabled={saving}
          onChange={(status) => patch({ status })}
        />
        <PrioritySelect
          value={ticket.priority}
          disabled={saving}
          onChange={(priority) => patch({ priority })}
        />
        <SupportStatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Message</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{ticket.message}</p>
          <dl className="mt-6 space-y-2 text-xs text-white/50">
            <div>
              <dt className="uppercase tracking-wide">Created</dt>
              <dd className="text-white/70">{formatAdminDate(ticket.created_at)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Updated</dt>
              <dd className="text-white/70">{formatAdminDate(ticket.updated_at)}</dd>
            </div>
            {ticket.resolved_at ? (
              <div>
                <dt className="uppercase tracking-wide">Resolved</dt>
                <dd className="text-white/70">{formatAdminDate(ticket.resolved_at)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="uppercase tracking-wide">Source</dt>
              <dd className="text-white/70">{ticket.source}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Internal notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            className="mt-3 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Team-only notes…"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ admin_notes: notes.trim() || null })}
            className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
          <p className="mt-4 text-xs text-white/45">
            <Link href={`/admin/customers/${encodeURIComponent(ticket.email)}`} className="text-violet-300/80 hover:text-violet-200">
              View customer profile →
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
