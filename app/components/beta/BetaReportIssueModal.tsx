"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { createPortal } from "react-dom"
import {
  BETA_ISSUE_PRIORITIES,
  BETA_ISSUE_PRIORITY_LABELS,
  type BetaIssuePriority,
} from "../../../lib/betaIssueTypes"
import { dispatchBetaProfilePanel, dispatchBetaProfileRefresh } from "../../../lib/betaMasterTrackingClient"
import { getStoredBetaEmail } from "../../../lib/betaSessionStorage"
import type { BetaProfilePanelData } from "../../../lib/betaProfilePanel"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  open: boolean
  onClose: () => void
}

function newActionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `issue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function BetaReportIssueModal({ open, onClose }: Props) {
  const reduce = useReducedMotion()
  const titleId = useId()
  const [portalReady, setPortalReady] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [expectedResult, setExpectedResult] = useState("")
  const [priority, setPriority] = useState<BetaIssuePriority>("medium")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(false)
  const actionIdRef = useRef("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setTitle("")
    setDescription("")
    setExpectedResult("")
    setPriority("medium")
    setScreenshot(null)
    setError("")
    setSubmitted(false)
    setPointsEarned(false)
    actionIdRef.current = newActionId()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, submitting])

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim()
    const trimmedDesc = description.trim()
    if (trimmedTitle.length < 3) {
      setError("Please enter an issue title.")
      return
    }
    if (trimmedDesc.length < 10) {
      setError("Please describe what happened (at least 10 characters).")
      return
    }

    setSubmitting(true)
    setError("")

    const form = new FormData()
    form.set("actionId", actionIdRef.current)
    form.set("title", trimmedTitle)
    form.set("description", trimmedDesc)
    form.set("expectedResult", expectedResult.trim())
    form.set("priority", priority)
    const email = getStoredBetaEmail()
    if (email) form.set("email", email)
    if (screenshot) form.set("screenshot", screenshot)

    try {
      const res = await fetch("/api/beta/issues", {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        alreadyCounted?: boolean
        pointsAwarded?: number
        panel?: BetaProfilePanelData | null
      } | null

      if (!res.ok) {
        setError(json?.error ?? "Could not submit issue.")
        return
      }

      if (json?.panel) dispatchBetaProfilePanel(json.panel)
      dispatchBetaProfileRefresh()
      setPointsEarned(Boolean(json?.pointsAwarded) && !json?.alreadyCounted)
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }, [title, description, expectedResult, priority, screenshot])

  if (!portalReady || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/72 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative z-10 mx-auto flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0a0a12] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:rounded-2xl sm:m-4"
      >
        {submitted ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <p className="text-lg font-semibold text-white">
              <span className="text-emerald-300/95" aria-hidden>
                ✓{" "}
              </span>
              Thanks for reporting this
            </p>
            {pointsEarned ? (
              <p className="mt-3 text-[13px] font-semibold text-violet-200/90">+2 Insider points earned</p>
            ) : (
              <p className="mt-3 text-[13px] text-white/50">We already received this report.</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-8 inline-flex min-h-[46px] w-full max-w-xs items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] px-5 text-[14px] font-semibold text-white/85 transition hover:bg-white/[0.08]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <p id={titleId} className="text-lg font-semibold tracking-tight text-white">
                <span aria-hidden>🐞 </span>
                Report Issue
              </p>
              <p className="mt-1 text-[13px] text-white/55">Help us fix problems faster with clear details.</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="beta-issue-title" className="text-[12px] font-medium text-white/75">
                    Issue title
                  </label>
                  <input
                    id="beta-issue-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-violet-400/35"
                    placeholder="Short summary"
                    maxLength={120}
                  />
                </div>

                <div>
                  <label htmlFor="beta-issue-desc" className="text-[12px] font-medium text-white/75">
                    What happened?
                  </label>
                  <textarea
                    id="beta-issue-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-violet-400/35"
                    placeholder="Steps to reproduce, what you saw…"
                  />
                </div>

                <div>
                  <label htmlFor="beta-issue-expected" className="text-[12px] font-medium text-white/75">
                    What did you expect?
                  </label>
                  <textarea
                    id="beta-issue-expected"
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    rows={2}
                    className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-violet-400/35"
                    placeholder="What should have happened instead?"
                  />
                </div>

                <div>
                  <p className="text-[12px] font-medium text-white/75">Upload screenshot (optional)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="mt-1.5 block w-full text-[12px] text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600/80 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
                    onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  />
                </div>

                <fieldset>
                  <legend className="text-[12px] font-medium text-white/75">Priority</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {BETA_ISSUE_PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`min-h-[2.5rem] rounded-lg border px-2 py-2 text-[12px] font-semibold transition ${
                          priority === p
                            ? "border-violet-400/40 bg-violet-600/25 text-white"
                            : "border-white/[0.08] bg-white/[0.03] text-white/65 hover:border-white/[0.12]"
                        }`}
                      >
                        {BETA_ISSUE_PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              {error ? (
                <p className="mt-3 text-xs text-rose-300/90" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="border-t border-white/[0.06] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4f46e5] to-[#1d4ed8] px-5 text-[14px] font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.14)] transition hover:brightness-[1.06] disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit issue"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-[14px] font-semibold text-white/62 transition hover:bg-white/[0.06] disabled:opacity-50 sm:min-w-[5.5rem]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body,
  )
}
