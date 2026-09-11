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
          className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10 disabled:opacity-50"
        >
          {betaApproved ? "Approved" : "Approve"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void runAction("promote_rank")}
          className={`${ADMIN_BUTTON_PRIMARY} disabled:opacity-50`}
          title="Optional override — ranks otherwise update from beta points"
        >
          Promote rank (override)
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void runAction("invite")}
          className={`${ADMIN_BUTTON_PRIMARY} disabled:opacity-50`}
        >
          Send invite code
        </button>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-white/45">
        Mark feedback as useful: add &quot;useful&quot; in feedback admin notes (+5 pts). Creator invites: set
        referred user notes to <code className="text-violet-200/80">referred_by:their@email.com</code> (+3 pts).
        Ranks update automatically from points (10 / 25 / 50 / 100).
      </p>

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
