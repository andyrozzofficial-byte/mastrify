"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import type { BetaProfilePanelData } from "../../../lib/betaProfilePanel"

const EASE = [0.22, 1, 0.36, 1] as const
const PANEL_MS = 0.28

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function formatActivityDate(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (days < 1) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{title}</h3>
      {children}
    </section>
  )
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-white/38">{label}</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums text-white/92">{value}</p>
    </div>
  )
}

type Props = {
  open: boolean
  onClose: () => void
}

export default function BetaProfileSlideOver({ open, onClose }: Props) {
  const reduce = useReducedMotion()
  const [portalReady, setPortalReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<BetaProfilePanelData | null>(null)

  const loadPanel = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/beta/profile/panel", { cache: "no-store", credentials: "include" })
      const json = (await res.json().catch(() => null)) as { panel?: BetaProfilePanelData; error?: string } | null
      if (!res.ok) {
        setError(json?.error ?? "Could not load your beta profile.")
        setPanel(null)
        return
      }
      setPanel(json?.panel ?? null)
    } catch {
      setError("Could not load your beta profile.")
      setPanel(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    void loadPanel()
  }, [open, loadPanel])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!portalReady) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[220] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : PANEL_MS }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label="Close beta profile"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="beta-profile-title"
            className="relative flex h-full w-full max-w-[min(100vw,24rem)] flex-col border-l border-white/[0.08] bg-gradient-to-b from-[#12121a] via-[#0a0a10] to-black shadow-[-24px_0_64px_rgba(0,0,0,0.55)]"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ duration: reduce ? 0 : PANEL_MS, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/35 to-transparent"
              aria-hidden
            />
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/65">
                  Private beta
                </p>
                <h2 id="beta-profile-title" className="mt-1 text-lg font-semibold tracking-tight text-white">
                  My Beta Profile
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                aria-label="Close"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {loading ? (
                <div className="flex justify-center py-16" aria-live="polite">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-violet-400/90" />
                </div>
              ) : error ? (
                <p className="py-8 text-center text-sm text-rose-300/88" role="alert">
                  {error}
                </p>
              ) : panel ? (
                <div className="space-y-8 pb-6">
                  <Section title="Profile">
                    <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-white/45">Name</span>
                        <span className="text-[13px] font-medium text-white/88">{panel.profile.name ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-white/45">Email</span>
                        <span className="truncate text-[13px] font-medium text-white/88">{panel.profile.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-white/45">Rank</span>
                        <span className="rounded-full border border-violet-400/25 bg-violet-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-violet-100/90">
                          {panel.profile.rankLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-white/45">Joined</span>
                        <span className="text-[13px] text-white/82">{formatJoinedDate(panel.profile.joinedDate)}</span>
                      </div>
                    </div>
                  </Section>

                  <Section title="Progress">
                    <div className="space-y-3 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] text-white/45">Points</span>
                        <span className="text-[15px] font-semibold tabular-nums text-violet-100/95">
                          {panel.progress.points}
                          {panel.progress.pointsToNext != null && panel.progress.nextRankLabel ? (
                            <span className="ml-1.5 text-[12px] font-normal text-white/45">
                              · {panel.progress.pointsToNext} to {panel.progress.nextRankLabel}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-white/[0.08]"
                        role="progressbar"
                        aria-valuenow={panel.progress.progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400"
                          style={{ width: `${panel.progress.progressPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-white/50">{panel.progress.progressLabel}</p>
                    </div>
                  </Section>

                  <Section title="Activity">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <StatCell label="Masters" value={panel.activity.mastersCompleted} />
                      <StatCell label="Feedback" value={panel.activity.feedbackSubmitted} />
                      <StatCell label="Bug reports" value={panel.activity.bugReports} />
                      <StatCell label="Downloads" value={panel.activity.downloads} />
                      <StatCell label="Active days" value={panel.activity.activeDays} />
                    </div>
                  </Section>

                  <Section title="Rewards">
                    <div className="space-y-3 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3.5">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-white/38">Current</p>
                        <p className="mt-1 text-[13px] leading-snug text-white/85">{panel.rewards.currentReward}</p>
                      </div>
                      <div className="border-t border-white/[0.06] pt-3">
                        <p className="text-[11px] uppercase tracking-wide text-white/38">Next reward</p>
                        <p className="mt-1 text-[13px] leading-snug text-white/85">{panel.rewards.nextReward}</p>
                        {panel.rewards.nextRewardDetail ? (
                          <p className="mt-0.5 text-[12px] text-white/50">{panel.rewards.nextRewardDetail}</p>
                        ) : null}
                      </div>
                      {panel.rewards.discountCodes.length > 0 ? (
                        <ul className="space-y-1.5 border-t border-white/[0.06] pt-3">
                          {panel.rewards.discountCodes.map((item) => (
                            <li
                              key={`${item.pointsRequired}-${item.label}`}
                              className={`flex items-center justify-between gap-2 text-[12px] ${
                                item.unlocked ? "text-white/78" : "text-white/40"
                              }`}
                            >
                              <span>{item.label}</span>
                              <span className="shrink-0 text-[10px] uppercase tracking-wide">
                                {item.unlocked ? "Unlocked" : `${item.pointsRequired} pts`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {panel.rewards.adminCodes.length > 0 ? (
                        <div className="border-t border-white/[0.06] pt-3">
                          <p className="text-[11px] uppercase tracking-wide text-white/38">Your codes</p>
                          <ul className="mt-2 space-y-1">
                            {panel.rewards.adminCodes.map((code) => (
                              <li
                                key={code}
                                className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-1.5 font-mono text-[12px] text-violet-100/90"
                              >
                                {code}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </Section>

                  <Section title="Recent activity">
                    {panel.recentActivity.length === 0 ? (
                      <p className="text-[13px] text-white/45">No activity yet — upload a mix to get started.</p>
                    ) : (
                      <ul className="space-y-2">
                        {panel.recentActivity.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-medium text-white/88">{item.label}</p>
                              <time className="shrink-0 text-[11px] text-white/38" dateTime={item.createdAt}>
                                {formatActivityDate(item.createdAt)}
                              </time>
                            </div>
                            {item.detail ? (
                              <p className="mt-0.5 truncate text-[12px] text-white/48">{item.detail}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
