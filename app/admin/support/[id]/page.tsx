"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { FormEvent, useCallback, useEffect, useState } from "react"
import { categoryLabel } from "../../../../lib/supportTypes"
import type { AdminSupportPriority, AdminSupportRow, AdminSupportStatus } from "../../../../lib/adminTypes"
import {
  AdminCard,
  AdminPageHeader,
  formatAdminDate,
  PriorityBadge,
  PrioritySelect,
  SupportStatusBadge,
  SupportStatusSelect,
} from "../../../components/admin/admin-shared"

function ThreadBubble({
  author,
  body,
  created_at,
}: {
  author: "user" | "admin"
  body: string
  created_at: string
}) {
  const isAdmin = author === "admin"
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
          isAdmin
            ? "border border-violet-200 bg-violet-50 text-slate-800"
            : "border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {isAdmin ? "Mastrify team" : "Customer"} · {formatAdminDate(created_at)}
        </p>
        <p className="mt-2 whitespace-pre-wrap">{body}</p>
      </div>
    </div>
  )
}

export default function AdminSupportTicketPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const [ticket, setTicket] = useState<AdminSupportRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [reply, setReply] = useState("")
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

  async function sendReply(e: FormEvent) {
    e.preventDefault()
    const text = reply.trim()
    if (!text) return
    setSaving(true)
    const res = await fetch(`/api/admin/support/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    })
    setSaving(false)
    if (res.ok) {
      setReply("")
      void load()
    }
  }

  if (error) return <p className="text-sm text-rose-600">{error}</p>
  if (!ticket) return <p className="text-sm text-slate-600">Loading ticket…</p>

  const ctx = ticket.session_context as Record<string, unknown>
  const ctxRows = [
    ctx.sessionId ? `Session ID: ${String(ctx.sessionId)}` : null,
    ctx.trackName ? `Track: ${String(ctx.trackName)}` : null,
    ctx.masteringStyle ? `Style: ${String(ctx.masteringStyle)}` : null,
    ctx.lufs != null ? `LUFS: ${String(ctx.lufs)}` : null,
    ctx.processingTimeMs != null
      ? `Processing: ${(Number(ctx.processingTimeMs) / 1000).toFixed(1)}s`
      : null,
    ctx.fileId ? `File ID: ${String(ctx.fileId)}` : null,
    ctx.pathname ? `Page: ${String(ctx.pathname)}` : null,
  ].filter(Boolean) as string[]

  const thread =
    ticket.thread.length > 0
      ? ticket.thread
      : [{ id: "initial", author: "user" as const, body: ticket.message, created_at: ticket.created_at }]

  return (
    <div>
      <AdminPageHeader
        title={ticket.subject ?? "Support ticket"}
        subtitle={`${ticket.email}${ticket.category ? ` · ${categoryLabel(ticket.category)}` : ""}`}
        actions={
          <Link href="/admin/support" className="text-xs font-medium text-violet-600 hover:text-violet-800">
            ← Back to inbox
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
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
        {ticket.status !== "resolved" && ticket.status !== "closed" ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ status: "resolved" })}
            className="rounded-lg border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10 disabled:opacity-60"
          >
            Mark resolved
          </button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AdminCard className="!p-5">
            <h2 className="text-[15px] font-semibold text-slate-950">Conversation</h2>
            <div className="mt-4 space-y-4">
              {thread.map((msg) => (
                <ThreadBubble key={msg.id} {...msg} />
              ))}
            </div>
            <form onSubmit={sendReply} className="mt-6 border-t border-slate-200 pt-5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Reply to customer
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                placeholder="Your reply — sets status to Waiting for user"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="submit"
                disabled={saving || !reply.trim()}
                className="mt-3 rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10 disabled:opacity-60"
              >
                {saving ? "Sending…" : "Send reply"}
              </button>
            </form>
          </AdminCard>
        </div>

        <div className="space-y-4">
          {ctxRows.length > 0 ? (
            <AdminCard className="!p-4">
              <h2 className="text-sm font-semibold text-slate-950">Session context</h2>
              <ul className="mt-3 space-y-1.5 text-[12px] text-slate-700">
                {ctxRows.map((line) => (
                  <li key={line} className="font-mono text-[11px]">
                    {line}
                  </li>
                ))}
              </ul>
              {Array.isArray(ctx.errorLogs) && ctx.errorLogs.length > 0 ? (
                <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] text-slate-600">
                  {(ctx.errorLogs as string[]).join("\n")}
                </pre>
              ) : null}
            </AdminCard>
          ) : null}

          <AdminCard className="!p-4">
            <h2 className="text-sm font-semibold text-slate-950">Internal notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Team-only notes…"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => patch({ admin_notes: notes.trim() || null })}
              className="mt-3 rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10 disabled:opacity-60"
            >
              Save notes
            </button>
            <dl className="mt-5 space-y-2 text-xs text-slate-600">
              <div>
                <dt className="uppercase tracking-wide">Created</dt>
                <dd>{formatAdminDate(ticket.created_at)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Updated</dt>
                <dd>{formatAdminDate(ticket.updated_at)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Source</dt>
                <dd>{ticket.source}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs">
              <Link
                href={`/admin/customers/${encodeURIComponent(ticket.email)}`}
                className="font-medium text-violet-600 hover:text-violet-800"
              >
                View customer profile →
              </Link>
            </p>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}
