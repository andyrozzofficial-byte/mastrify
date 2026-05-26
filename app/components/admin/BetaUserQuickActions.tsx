"use client"

import { useEffect, useState } from "react"
import { ADMIN_BUTTON_PRIMARY } from "./admin-shared"

export function BetaUserQuickActions({
  email,
  betaApproved,
  adminNotes,
  onUpdated,
}: {
  email: string
  betaApproved: boolean
  adminNotes: string | null
  onUpdated: () => void
}) {
  const [notes, setNotes] = useState(adminNotes ?? "")

  useEffect(() => {
    setNotes(adminNotes ?? "")
  }, [adminNotes])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [inviteText, setInviteText] = useState<string | null>(null)

  async function runAction(action: string, extra?: Record<string, unknown>) {
    setSaving(true)
    setMessage(null)
    const res = await fetch(`/api/admin/beta-users/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    })
    const json = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok) {
      setMessage(json?.error ?? "Action failed")
      return
    }
    if (action === "invite" && json?.invite?.inviteMessage) {
      setInviteText(json.invite.inviteMessage as string)
      try {
        await navigator.clipboard.writeText(json.invite.inviteMessage as string)
        setMessage("Invite copied to clipboard")
      } catch {
        setMessage("Invite ready — copy from the box below")
      }
      return
    }
    if (json?.betaRank) setMessage(`Rank updated to ${json.betaRank}`)
    else if (action === "approve") setMessage("Beta user approved")
    else setMessage("Saved")
    onUpdated()
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <h2 className="text-[15px] font-semibold text-white">Quick actions</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || betaApproved}
          onClick={() => void runAction("approve")}
          className="rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {betaApproved ? "Approved" : "Approve"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void runAction("promote_rank")}
          className={`${ADMIN_BUTTON_PRIMARY} disabled:opacity-50`}
        >
          Promote rank
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void runAction("invite")}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Send invite code
        </button>
      </div>

      <label className="mt-5 block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/42">Admin note</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0f0f11] px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => void runAction("save_notes", { notes: notes.trim() || null })}
        className={`mt-2 ${ADMIN_BUTTON_PRIMARY} disabled:opacity-50`}
      >
        Save note
      </button>

      {message ? <p className="mt-3 text-xs text-violet-200/90">{message}</p> : null}
      {inviteText ? (
        <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-white/70 whitespace-pre-wrap">
          {inviteText}
        </pre>
      ) : null}
    </div>
  )
}
