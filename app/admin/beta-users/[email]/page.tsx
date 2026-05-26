"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { BetaUserProfile } from "../../../../lib/adminTypes"
import type { BetaTimelineEventType } from "../../../../lib/adminTypes"
import {
  AdminCard,
  AdminPageHeader,
  AvatarCircle,
  FeedbackStatusBadge,
  formatAdminDate,
  SupportStatusBadge,
} from "../../../components/admin/admin-shared"
import { BetaEngagementBadge } from "../../../components/admin/BetaEngagementBadge"
import { BetaUserQuickActions } from "../../../components/admin/BetaUserQuickActions"

const TIMELINE_DOT: Record<BetaTimelineEventType, string> = {
  signup: "bg-violet-400",
  upload: "bg-sky-400",
  master: "bg-emerald-400",
  feedback: "bg-amber-400",
  support: "bg-rose-400",
  download: "bg-cyan-400",
}

function formatSignup(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export default function AdminBetaUserProfilePage() {
  const params = useParams()
  const emailParam = typeof params.email === "string" ? params.email : ""
  const email = decodeURIComponent(emailParam)

  const [profile, setProfile] = useState<BetaUserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/beta-users/${encodeURIComponent(email)}`, {
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      setError(json?.error ?? "Beta user not found")
      return
    }
    setProfile(json.profile as BetaUserProfile)
    setError(null)
  }, [email])

  useEffect(() => {
    if (email) void load()
  }, [email, load])

  if (error) return <p className="text-sm text-rose-300/90">{error}</p>
  if (!profile) return <p className="text-sm text-white/50">Loading beta profile…</p>

  return (
    <div>
      <AdminPageHeader
        title={profile.name ?? profile.email}
        subtitle="Aggregated from feedback surveys, support, and mastering sessions."
        actions={
          <Link href="/admin/beta-users" className="text-xs text-violet-300/80 hover:text-violet-200">
            ← All beta users
          </Link>
        }
      />

      <div className="mb-8 flex items-start gap-4">
        <AvatarCircle email={profile.email} size="lg" />
        <div className="text-sm text-white/55">
          <p>{profile.email}</p>
          <p className="mt-1">
            Beta rank: <span className="text-white/85">{profile.betaRank}</span>
            {profile.genre ? (
              <>
                {" "}
                · Genre: <span className="text-white/85">{profile.genre}</span>
              </>
            ) : null}
            {profile.daw ? (
              <>
                {" "}
                · DAW: <span className="text-white/85">{profile.daw}</span>
              </>
            ) : null}
          </p>
          <p className="mt-1">Signed up: {formatSignup(profile.signupDate)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BetaEngagementBadge level={profile.engagementLevel} score={profile.engagementScore} />
            {profile.betaApproved ? (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                Approved
              </span>
            ) : null}
          </div>
          {profile.badges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.badges.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80"
                >
                  <span aria-hidden>{b.emoji}</span>
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminCard>
            <h2 className="text-[15px] font-semibold text-white">Activity timeline</h2>
            {profile.timeline.length === 0 ? (
              <p className="mt-3 text-sm text-white/45">No activity recorded yet.</p>
            ) : (
              <ul className="mt-4 space-y-0">
                {profile.timeline.map((event, i) => (
                  <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < profile.timeline.length - 1 ? (
                      <span
                        className="absolute left-[7px] top-4 h-[calc(100%-4px)] w-px bg-white/10"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-[1] mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-[#141416] ${TIMELINE_DOT[event.type]}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      {event.href ? (
                        <Link href={event.href} className="text-sm font-medium text-violet-200 hover:text-violet-100">
                          {event.label}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-white/90">{event.label}</p>
                      )}
                      {event.detail ? <p className="mt-0.5 text-xs text-white/45">{event.detail}</p> : null}
                      <p className="mt-1 text-[11px] text-white/38">{formatAdminDate(event.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
        <BetaUserQuickActions
          email={profile.email}
          betaApproved={profile.betaApproved}
          adminNotes={profile.adminNotes}
          onUpdated={() => void load()}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Masters</p>
          <p className="mt-2 text-2xl font-semibold text-white">{profile.masterCount}</p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Feedback submitted</p>
          <p className="mt-2 text-2xl font-semibold text-white">{profile.feedbackCount}</p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Support tickets</p>
          <p className="mt-2 text-2xl font-semibold text-white">{profile.supportCount}</p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Recommendation score</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {profile.avgRecommend != null ? profile.avgRecommend.toFixed(1) : "—"}
          </p>
        </AdminCard>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Most used style</p>
          <p className="mt-2 text-lg font-medium text-white">{profile.topStyle ?? "—"}</p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Most common issue</p>
          <p className="mt-2 text-lg font-medium text-white">{profile.topIssue ?? "—"}</p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Last active</p>
          <p className="mt-2 text-lg font-medium text-white">{profile.lastActivity ?? "—"}</p>
        </AdminCard>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Uploads</p>
          <p className="mt-2 text-xl font-semibold text-white">{profile.uploadCount}</p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Downloads</p>
          <p className="mt-2 text-xl font-semibold text-white">{profile.downloadCount}</p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Avg LUFS</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {profile.avgLufs != null ? profile.avgLufs.toFixed(1) : "—"}
          </p>
        </AdminCard>
        <AdminCard className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Active days</p>
          <p className="mt-2 text-xl font-semibold text-white">{profile.activeDays}</p>
        </AdminCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h2 className="text-[15px] font-semibold text-white">Positive comments</h2>
          {profile.positiveTags.length === 0 ? (
            <p className="text-sm text-white/45">None yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-white/75">
              {profile.positiveTags.slice(0, 8).map((t) => (
                <li key={t.label} className="flex justify-between gap-2">
                  <span>{t.label}</span>
                  <span className="tabular-nums text-white/40">{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="text-[15px] font-semibold text-white">Issues & missing features</h2>
          {profile.issueTags.length === 0 && profile.missingFeatures.length === 0 ? (
            <p className="text-sm text-white/45">None yet.</p>
          ) : (
            <div className="space-y-4 text-sm text-white/75">
              {profile.issueTags.length > 0 ? (
                <ul className="space-y-2">
                  {profile.issueTags.slice(0, 6).map((t) => (
                    <li key={t.label} className="flex justify-between gap-2">
                      <span>{t.label}</span>
                      <span className="tabular-nums text-white/40">{t.count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {profile.missingFeatures.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/42">
                    Missing features
                  </p>
                  <ul className="list-disc space-y-1 pl-4">
                    {profile.missingFeatures.slice(0, 5).map((m, i) => (
                      <li key={`${i}-${m.slice(0, 24)}`}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </AdminCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h2 className="text-[15px] font-semibold text-white">Feedback history</h2>
          {profile.feedback.length === 0 ? (
            <p className="text-sm text-white/45">No survey submissions.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {profile.feedback.slice(0, 12).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div>
                    <Link href={`/admin/feedback/${f.id}`} className="text-sm font-medium text-violet-200 hover:text-violet-100">
                      {f.track_name ?? "Untitled track"}
                    </Link>
                    <p className="text-xs text-white/42">{formatAdminDate(f.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-white/55">NPS {f.recommend_score}</span>
                    <FeedbackStatusBadge status={f.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="text-[15px] font-semibold text-white">Support</h2>
          {profile.support.length === 0 ? (
            <p className="text-sm text-white/45">No tickets.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {profile.support.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div>
                    <Link href={`/admin/support/${s.id}`} className="text-sm font-medium text-violet-200 hover:text-violet-100">
                      {s.subject}
                    </Link>
                    <p className="text-xs text-white/42">{formatAdminDate(s.created_at)}</p>
                  </div>
                  <SupportStatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      {profile.sessions.length > 0 ? (
        <AdminCard className="mt-8">
          <h2 className="text-[15px] font-semibold text-white">Session IDs</h2>
          <p className="mt-2 font-mono text-xs leading-relaxed text-white/55">{profile.sessions.join(", ")}</p>
        </AdminCard>
      ) : null}
    </div>
  )
}
