"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import type { BetaProfilePanelData } from "../../../lib/betaProfilePanel"
import { BETA_PROFILE_REFRESH_EVENT } from "../../../lib/betaMasterTrackingClient"

const EASE = [0.22, 1, 0.36, 1] as const
const PANEL_MS = 0.28

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
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

function DashboardCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`product-surface-card p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{children}</h3>
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
    const onRefresh = () => {
      if (!open) return
      void loadPanel()
    }
    window.addEventListener(BETA_PROFILE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(BETA_PROFILE_REFRESH_EVENT, onRefresh)
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

  const displayName = panel?.profile.name?.trim() || panel?.profile.email || "Beta member"

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
            className="relative flex h-full w-full max-w-[min(100vw,900px)] flex-col border-l border-white/[0.08] bg-gradient-to-b from-[#12121a] via-[#0a0a10] to-black shadow-[-24px_0_64px_rgba(0,0,0,0.55)]"
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

            <header className="shrink-0 border-b border-white/[0.06]">
              <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-8 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/65">
                    Private beta
                  </p>
                  <h2 id="beta-profile-title" className="mt-0.5 truncate text-lg font-semibold tracking-tight text-white">
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
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto w-full max-w-[900px] px-8 py-5 pb-8 sm:py-6">
                {loading ? (
                  <div className="flex justify-center py-20" aria-live="polite">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-violet-400/90" />
                  </div>
                ) : error ? (
                  <p className="py-12 text-center text-sm text-rose-300/88" role="alert">
                    {error}
                  </p>
                ) : panel ? (
                  <div className="flex flex-col gap-5 sm:gap-6">
                    <DashboardCard>
                      <div className="flex flex-wrap items-start gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-violet-500/10 text-lg"
                          aria-hidden
                        >
                          👤
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[1.05rem] font-semibold leading-snug tracking-tight text-white">
                            {displayName}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full border border-violet-400/28 bg-violet-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-violet-100/90">
                              {panel.profile.rankLabel}
                            </span>
                            <span className="text-[12px] text-white/45">
                              Joined: {formatJoinedDate(panel.profile.joinedDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-white/[0.06] pt-5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-white/42">Progress</p>
                        <div
                          className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.08]"
                          role="progressbar"
                          aria-valuenow={panel.progress.progressPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Beta progress"
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400"
                            style={{ width: `${panel.progress.progressPct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[13px] font-medium tabular-nums text-white/82">
                          {panel.progress.progressLabel}
                        </p>
                        <p className="mt-2 text-[13px] leading-snug text-white/58">
                          <span className="text-white/42">Next reward: </span>
                          {panel.rewards.nextReward}
                        </p>
                      </div>
                    </DashboardCard>

                    <div>
                      <SectionHeading>Stats</SectionHeading>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                        {(
                          [
                            ["Masters", panel.activity.mastersCompleted],
                            ["Feedback", panel.activity.feedbackSubmitted],
                            ["Bug reports", panel.activity.bugReports],
                            ["Active days", panel.activity.activeDays],
                          ] as const
                        ).map(([label, value]) => (
                          <DashboardCard key={label} className="!p-3.5 sm:!p-4">
                            <p className="text-center text-[10px] font-medium uppercase tracking-wide text-white/40">
                              {label}
                            </p>
                            <p className="mt-2 text-center text-xl font-semibold tabular-nums text-white/95">{value}</p>
                          </DashboardCard>
                        ))}
                      </div>
                    </div>

                    <div>
                      <SectionHeading>Rewards</SectionHeading>
                      <DashboardCard className="space-y-4">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Current</p>
                          <p className="mt-1.5 text-[14px] leading-snug text-white/88">{panel.rewards.currentReward}</p>
                        </div>
                        <div className="border-t border-white/[0.06] pt-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Next</p>
                          <p className="mt-1.5 text-[14px] leading-snug text-white/88">
                            <span aria-hidden>🎁 </span>
                            {panel.rewards.nextReward}
                          </p>
                          {panel.rewards.nextRewardDetail ? (
                            <p className="mt-1 text-[12px] text-white/50">{panel.rewards.nextRewardDetail}</p>
                          ) : null}
                        </div>
                        {panel.rewards.adminCodes.length > 0 ? (
                          <div className="border-t border-white/[0.06] pt-4">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Your codes</p>
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {panel.rewards.adminCodes.map((code) => (
                                <li
                                  key={code}
                                  className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 font-mono text-[12px] text-violet-100/90"
                                >
                                  {code}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </DashboardCard>
                    </div>

                    <div>
                      <SectionHeading>Recent activity</SectionHeading>
                      <DashboardCard>
                        {panel.recentActivity.length === 0 ? (
                          <p className="text-[13px] text-white/45">No activity yet — upload a mix to get started.</p>
                        ) : (
                          <ul className="space-y-2.5">
                            {panel.recentActivity.map((item) => (
                              <li key={item.id} className="flex items-start gap-2.5 text-[13px] leading-snug">
                                <span className="mt-0.5 shrink-0 text-violet-400/75" aria-hidden>
                                  •
                                </span>
                                <span className="min-w-0 flex-1 text-white/82">{item.label}</span>
                                <time
                                  className="shrink-0 text-[11px] tabular-nums text-white/35"
                                  dateTime={item.createdAt}
                                >
                                  {formatActivityDate(item.createdAt)}
                                </time>
                              </li>
                            ))}
                          </ul>
                        )}
                      </DashboardCard>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
