"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useMasterSession } from "../master/MasterSessionProvider"
import CinematicBackground from "../components/CinematicBackground"
import { HELP_FAQ_ITEMS, POPULAR_HELP_FAQ, searchHelpFaq, type HelpFaqItem } from "../../lib/helpFaq"
import { masteringStyleLabel } from "../../lib/masterStyleLabels"
import { readSupportSessionContext } from "../../lib/readSupportSessionContext"
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  type SupportSessionContext,
  type SupportTicketCategory,
} from "../../lib/supportTypes"

const EASE = [0.22, 1, 0.36, 1] as const

function FaqCard({ item, highlight }: { item: HelpFaqItem; highlight?: boolean }) {
  return (
    <article
      id={item.id}
      className={`rounded-[1.15rem] border px-5 py-4 transition duration-300 ${
        highlight
          ? "border-violet-400/35 bg-violet-500/[0.08] shadow-[0_0_0_1px_rgba(167,139,250,0.12)]"
          : "border-white/[0.09] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.045]"
      }`}
    >
      <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white/92">{item.question}</h3>
      <p className="mt-2.5 text-[14px] leading-[1.65] text-muted">{item.answer}</p>
    </article>
  )
}

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
    <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-violet-100/85">
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

export default function HelpCenterClient() {
  const reduce = useReducedMotion()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const master = useMasterSession()

  const [query, setQuery] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showTicket, setShowTicket] = useState(searchParams.get("ticket") === "1")

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState<SupportTicketCategory>("processing")
  const [ticketMessage, setTicketMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [ticketError, setTicketError] = useState<string | null>(null)
  const [ticketSuccess, setTicketSuccess] = useState(false)

  const sessionContext = useMemo((): SupportSessionContext => {
    const stored = readSupportSessionContext(pathname)
    if (!master.sessionId?.trim()) return stored
    return {
      ...stored,
      sessionId: master.sessionId,
      trackName: master.trackName ?? stored.trackName,
      masteringStyle: masteringStyleLabel(master.stylePreset),
      lufs: master.masterLufs ?? stored.lufs,
      processingTimeMs: master.processingTimeMs ?? stored.processingTimeMs,
      fileId: master.masterObjectKey || stored.fileId,
      pathname: pathname ?? stored.pathname,
    }
  }, [master, pathname])

  const searchResults = useMemo(() => searchHelpFaq(query), [query])
  const showSearchResults = query.trim().length > 0

  const openFaq = useCallback((item: HelpFaqItem) => {
    setActiveId(item.id)
    setQuery("")
    const el = document.getElementById(item.id)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  useEffect(() => {
    if (!activeId) return
    const t = window.setTimeout(() => setActiveId(null), 4000)
    return () => window.clearTimeout(t)
  }, [activeId])

  async function onSubmitTicket(e: FormEvent) {
    e.preventDefault()
    setTicketError(null)
    setSubmitting(true)
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: name.trim() || undefined,
        category,
        message: ticketMessage,
        sessionContext,
      }),
    })
    const json = await res.json().catch(() => null)
    setSubmitting(false)
    if (!res.ok) {
      setTicketError(json?.error ?? "Could not send ticket")
      return
    }
    setTicketSuccess(true)
    setTicketMessage("")
  }

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
      />

      <main className="page-container relative z-10 mx-auto flex w-full max-w-[720px] flex-col pb-20 pt-8 sm:pb-24 sm:pt-10 md:pb-28 md:pt-14">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70">
            Help center
          </span>
          <h1 className="mt-6 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white/95 sm:text-[2.35rem]">
            How can we help?
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-[1.7] text-muted">
            Search common questions first — most answers are instant. Tickets are only when you still need a human.
          </p>
        </motion.header>

        <motion.div
          className="relative mt-10"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: EASE }}
        >
          <label className="sr-only" htmlFor="help-search">
            Search help
          </label>
          <input
            id="help-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help..."
            className="w-full rounded-[1.15rem] border border-white/[0.11] bg-black/40 px-5 py-4 text-[15px] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition placeholder:text-white/35 focus:border-violet-400/45 focus:ring-2 focus:ring-violet-500/20"
            autoComplete="off"
          />
        </motion.div>

        {showSearchResults ? (
          <section className="mt-6 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-label-strong">
              {searchResults.length > 0 ? "Matching answers" : "No matches"}
            </p>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted">
                Try different keywords, or browse popular questions below.
              </p>
            ) : (
              searchResults.map((item) => (
                <FaqCard key={item.id} item={item} highlight={activeId === item.id} />
              ))
            )}
          </section>
        ) : null}

        {!showSearchResults ? (
          <>
            <section className="mt-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-label-strong">
                Popular questions
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {POPULAR_HELP_FAQ.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openFaq(item)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left text-[14px] font-medium text-white/88 transition hover:border-violet-400/30 hover:bg-violet-500/[0.06] hover:text-violet-100"
                    >
                      {item.question}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 space-y-3">
              {HELP_FAQ_ITEMS.map((item) => (
                <FaqCard key={item.id} item={item} highlight={activeId === item.id} />
              ))}
            </section>
          </>
        ) : null}

        <section className="mt-14 rounded-[1.35rem] border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-black/[0.75] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] md:p-8">
          <h2 className="text-lg font-semibold text-white/92">Still need help?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Create a support ticket and we&apos;ll follow up by email. Session details attach automatically when you&apos;re mastering.
          </p>

          {!showTicket ? (
            <button
              type="button"
              onClick={() => setShowTicket(true)}
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-7 text-[13px] font-semibold text-white shadow-[0_14px_36px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.1] transition hover:brightness-[1.04] sm:w-auto"
            >
              Create support ticket
            </button>
          ) : ticketSuccess ? (
            <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-4 text-[14px] text-emerald-100/90">
              <p className="font-medium">Ticket received</p>
              <p className="mt-1 text-emerald-200/75">
                We&apos;ll reply to <span className="text-white/90">{email}</span> when there&apos;s an update.
              </p>
              <button
                type="button"
                className="mt-4 text-[13px] font-medium text-violet-200/90 underline-offset-2 hover:underline"
                onClick={() => {
                  setTicketSuccess(false)
                  setShowTicket(false)
                }}
              >
                Back to help articles
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmitTicket} className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-label-strong">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/40"
                  required
                >
                  {SUPPORT_TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {SUPPORT_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-label-strong">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-label-strong">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/40"
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
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe the issue — what you expected vs what you heard or saw."
                  className="mt-2 w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2.5 text-sm text-white/90 outline-none focus:border-violet-400/40"
                />
              </div>
              <SessionContextPreview ctx={sessionContext} />
              {ticketError ? <p className="text-sm text-rose-300/90">{ticketError}</p> : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[46px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Submit ticket"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTicket(false)}
                  className="min-h-[46px] rounded-xl border border-white/[0.1] px-5 text-sm text-muted-strong transition hover:text-white/85"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-[12px] text-white/40">
            Prefer email only?{" "}
            <a href="mailto:hello@mastrify.com" className="text-violet-200/75 hover:text-violet-100">
              hello@mastrify.com
            </a>
          </p>
        </section>

        <p className="mx-auto mt-10 text-center text-[12px] text-white/38">
          <Link href="/master" className="text-violet-200/70 hover:text-violet-100">
            ← Back to mastering
          </Link>
        </p>
      </main>
    </motion.div>
  )
}
