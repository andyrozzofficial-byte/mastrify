"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { FormEvent, useEffect } from "react"
import { SUPPORT_SELF_HELP } from "../../lib/supportSelfHelp"
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  type SupportSessionContext,
  type SupportTicketCategory,
} from "../../lib/supportTypes"

const EASE = [0.22, 1, 0.36, 1] as const

function SessionContextPreview({ ctx }: { ctx: SupportSessionContext }) {
  const rows = [
    ctx.sessionId ? `Session: ${ctx.sessionId}` : null,
    ctx.trackName ? `Track: ${ctx.trackName}` : null,
    ctx.masteringStyle ? `Style: ${ctx.masteringStyle}` : null,
    ctx.lufs != null ? `LUFS: ${ctx.lufs}` : null,
    ctx.processingTimeMs != null ? `Processing: ${(ctx.processingTimeMs / 1000).toFixed(1)}s` : null,
    ctx.fileId ? `File: ${ctx.fileId}` : null,
  ].filter(Boolean) as string[]

  if (rows.length === 0) return null

  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-violet-100/85">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/70">
        Session will be attached
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

function SelfHelpCard({ category }: { category: SupportTicketCategory }) {
  const tips = SUPPORT_SELF_HELP[category]
  return (
    <div className="rounded-[1.15rem] border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-black/[0.5] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/75">
        Before creating a ticket
      </p>
      <ul className="mt-3 space-y-2">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2 text-[13px] leading-snug text-muted-strong">
            <span className="text-violet-300/90" aria-hidden>
              •
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}

type Props = {
  open: boolean
  onClose: () => void
  category: SupportTicketCategory
  onCategoryChange: (c: SupportTicketCategory) => void
  email: string
  onEmailChange: (v: string) => void
  name: string
  onNameChange: (v: string) => void
  ticketMessage: string
  onTicketMessageChange: (v: string) => void
  sessionContext: SupportSessionContext
  submitting: boolean
  ticketError: string | null
  ticketSuccess: boolean
  onSubmit: (e: FormEvent) => void
}

export default function SupportTicketModal({
  open,
  onClose,
  category,
  onCategoryChange,
  email,
  onEmailChange,
  name,
  onNameChange,
  ticketMessage,
  onTicketMessageChange,
  sessionContext,
  submitting,
  ticketError,
  ticketSuccess,
  onSubmit,
}: Props) {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex justify-center">
          <motion.button
            type="button"
            aria-label="Close support form"
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.28 }}
            onClick={onClose}
          />
          <div className="pointer-events-none relative flex h-full w-full max-w-[1200px] px-5 sm:px-8">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="support-ticket-title"
              className="pointer-events-auto relative ml-auto flex h-full w-full max-w-[min(100%,460px)] flex-col overflow-hidden border border-white/[0.12] bg-gradient-to-b from-[#121218] to-black shadow-[-20px_0_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(167,139,250,0.1)] max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:ml-0 max-sm:max-h-[min(92vh,820px)] max-sm:rounded-t-[1.35rem] sm:my-4 sm:max-h-[calc(100vh-2rem)] sm:rounded-l-[1.35rem]"
              initial={reduce ? false : { opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: 40 }}
              transition={{ duration: 0.38, ease: EASE }}
            >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/35 to-transparent"
              aria-hidden
            />
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/65">
                  Support
                </p>
                <h2 id="support-ticket-title" className="text-lg font-semibold text-white/92">
                  Create support ticket
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-muted-strong transition hover:border-white/[0.18] hover:text-white/85"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {ticketSuccess ? (
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-5 text-[14px] text-emerald-100/90">
                  <p className="font-medium">Ticket received</p>
                  <p className="mt-2 text-emerald-200/75">
                    We&apos;ll reply to <span className="text-white/90">{email}</span> when there&apos;s an update.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 text-[13px] font-medium text-violet-200/90 underline-offset-2 hover:underline"
                  >
                    Back to help
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-label-strong">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => onCategoryChange(e.target.value as SupportTicketCategory)}
                      className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/45 focus:ring-2 focus:ring-violet-500/15"
                      required
                    >
                      {SUPPORT_TICKET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {SUPPORT_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <SelfHelpCard category={category} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-label-strong">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/45 focus:ring-2 focus:ring-violet-500/15"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-label-strong">
                        Name (optional)
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/45"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-label-strong">
                      What happened?
                    </label>
                    <textarea
                      required
                      minLength={10}
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => onTicketMessageChange(e.target.value)}
                      placeholder="Describe the issue — what you expected vs what you heard or saw."
                      className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/45 focus:ring-2 focus:ring-violet-500/15"
                    />
                  </div>
                  <SessionContextPreview ctx={sessionContext} />
                  {ticketError ? <p className="text-sm text-rose-300/90">{ticketError}</p> : null}
                  <div className="flex flex-wrap gap-3 pb-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="min-h-[46px] flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-60 sm:flex-none"
                    >
                      {submitting ? "Sending…" : "Submit ticket"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-[46px] rounded-xl border border-white/[0.1] px-5 text-sm text-muted-strong transition hover:text-white/85"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
            </motion.div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
