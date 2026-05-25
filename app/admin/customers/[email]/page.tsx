"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { AdminCustomerProfile } from "../../../../lib/adminTypes"
import {
  AdminPageHeader,
  FeedbackStatusBadge,
  formatAdminDate,
  SupportStatusBadge,
} from "../../../components/admin/admin-shared"

export default function AdminCustomerProfilePage() {
  const params = useParams()
  const emailParam = typeof params.email === "string" ? params.email : ""
  const email = decodeURIComponent(emailParam)

  const [profile, setProfile] = useState<AdminCustomerProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [purchased, setPurchased] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(email)}`, {
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Customer not found")
      return
    }
    const p = json.profile as AdminCustomerProfile
    setProfile(p)
    setNotes(p.notes ?? "")
    setPurchased(p.purchased)
    setError(null)
  }, [email])

  useEffect(() => {
    if (email) void load()
  }, [email, load])

  async function saveProfile() {
    setSaving(true)
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || null, purchased }),
    })
    setSaving(false)
    if (res.ok) void load()
  }

  if (error) return <p className="text-sm text-rose-300/90">{error}</p>
  if (!profile) return <p className="text-sm text-white/50">Loading profile…</p>

  return (
    <div>
      <AdminPageHeader
        title={profile.email}
        subtitle={profile.name ?? "Customer profile"}
        actions={
          <Link href="/admin/customers" className="text-xs text-violet-300/80 hover:text-violet-200">
            ← All customers
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/45">Tracks mastered</p>
          <p className="mt-1 text-xl font-semibold text-white">{profile.totalTracksMastered}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/45">Exports</p>
          <p className="mt-1 text-xl font-semibold text-white">{profile.exportCount}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/45">Purchased</p>
          <p className="mt-1 text-xl font-semibold text-white">{profile.purchased ? "Yes" : "No"}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-wide text-white/45">Last activity</p>
          <p className="mt-1 text-sm text-white">
            {profile.lastActivity ? formatAdminDate(profile.lastActivity) : "—"}
          </p>
        </div>
      </div>

      <section className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-sm font-semibold text-white">Internal notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-3 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={purchased}
            onChange={(e) => setPurchased(e.target.checked)}
          />
          Mark as purchased
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveProfile()}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </section>

      <section className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-sm font-semibold text-white">Session activity</h2>
        {profile.sessions.length === 0 ? (
          <p className="mt-2 text-xs text-white/45">No session IDs recorded</p>
        ) : (
          <ul className="mt-2 space-y-1 font-mono text-xs text-white/60">
            {profile.sessions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Feedback history</h2>
          <ul className="mt-3 space-y-2">
            {profile.feedback.length === 0 ? (
              <li className="text-xs text-white/45">None</li>
            ) : (
              profile.feedback.map((f) => (
                <li key={f.id} className="rounded-lg border border-white/[0.05] px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-white/85">{f.track_name ?? "Untitled"}</span>
                    <FeedbackStatusBadge status={f.status} />
                  </div>
                  <p className="text-[10px] text-white/45">{formatAdminDate(f.created_at)}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white">Support history</h2>
          <ul className="mt-3 space-y-2">
            {profile.support.length === 0 ? (
              <li className="text-xs text-white/45">None</li>
            ) : (
              profile.support.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/[0.05] px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <Link href={`/admin/support/${s.id}`} className="text-sm text-violet-200/90 hover:text-violet-100">
                      {s.subject ?? "(No subject)"}
                    </Link>
                    <SupportStatusBadge status={s.status} />
                  </div>
                  <p className="text-[10px] text-white/45">{formatAdminDate(s.created_at)}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
