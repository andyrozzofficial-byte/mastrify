"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ASSISTANT_START_SUGGESTIONS,
  processingStatusLabel,
  respondAssistant,
  type AssistantReply,
} from "../../../lib/assistantRespond"
import { masteringStyleLabel } from "../../../lib/masterStyleLabels"
import { readSupportSessionContext } from "../../../lib/readSupportSessionContext"
import type { SupportSessionContext, SupportTicketCategory } from "../../../lib/supportTypes"
import { SUPPORT_CATEGORY_LABELS } from "../../../lib/supportTypes"
import { useMasterSession } from "../../master/MasterSessionProvider"

const EASE = [0.22, 1, 0.36, 1] as const

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  reply?: AssistantReply
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function SessionContextStrip({
  ctx,
  processingStatus,
}: {
  ctx: SupportSessionContext
  processingStatus: string | null
}) {
  const rows = [
    ctx.sessionId ? `Session: ${ctx.sessionId}` : null,
    ctx.trackName ? `Track: ${ctx.trackName}` : null,
    ctx.masteringStyle ? `Style: ${ctx.masteringStyle}` : null,
    ctx.lufs != null ? `LUFS: ${ctx.lufs}` : null,
    processingStatus ? `Status: ${processingStatus}` : null,
  ].filter(Boolean) as string[]

  if (rows.length === 0) return null

  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-3.5 py-2.5 text-[11px] leading-relaxed text-violet-100/85">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
        Session attached
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {rows.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

export default function MastrifyAssistant() {
  const reduce = useReducedMotion()
  const pathname = usePathname()
  const master = useMasterSession()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [ticketMode, setTicketMode] = useState(false)
  const [ticketCategory, setTicketCategory] = useState<SupportTicketCategory>("other")
  const [ticketEmail, setTicketEmail] = useState("")
  const [ticketBody, setTicketBody] = useState("")
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [ticketError, setTicketError] = useState<string | null>(null)
  const [lastUserQuery, setLastUserQuery] = useState("")

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

  const processingStatus = useMemo(
    () =>
      processingStatusLabel(pathname, {
        sessionId: master.sessionId,
        masteredUrl: master.masteredUrl,
        processingTimeMs: master.processingTimeMs,
      }),
    [pathname, master.sessionId, master.masteredUrl, master.processingTimeMs],
  )

  const inMasterSession = Boolean(sessionContext.sessionId?.trim())

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }, [])

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
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    scrollToBottom()
  }, [messages, ticketMode, scrollToBottom])

  const appendExchange = useCallback(
    (userText: string) => {
      const reply = respondAssistant(userText)
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", text: userText },
        { id: newId(), role: "assistant", text: reply.answer, reply },
      ])
      if (reply.suggestTicket && reply.ticketCategory) {
        setTicketCategory(reply.ticketCategory)
      }
      return reply
    },
    [],
  )

  function handleSend(text?: string) {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return
    setInput("")
    setLastUserQuery(trimmed)
    appendExchange(trimmed)
  }

  function openTicketForm(prefill?: string, category?: SupportTicketCategory) {
    if (category) setTicketCategory(category)
    if (prefill) setTicketBody(prefill)
    setTicketError(null)
    setTicketMode(true)
  }

  async function submitTicket(e: FormEvent) {
    e.preventDefault()
    setTicketError(null)
    setTicketSubmitting(true)
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ticketEmail,
        category: ticketCategory,
        message: `[Mastrify Assistant]\n\n${ticketBody}`,
        sessionContext,
      }),
    })
    const json = await res.json().catch(() => null)
    setTicketSubmitting(false)
    if (!res.ok) {
      setTicketError(json?.error ?? "Could not send ticket")
      return
    }
    setTicketMode(false)
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        text: `Ticket received — we'll reply to ${ticketEmail} when there's an update.`,
      },
    ])
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Mastrify Assistant"
        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2.5 rounded-full border border-violet-400/35 bg-gradient-to-b from-violet-600/95 via-indigo-700/95 to-indigo-900/95 px-5 py-3 text-[13px] font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(167,139,250,0.2)] transition hover:brightness-[1.06] active:scale-[0.98]"
      >
        <span
          className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
          aria-hidden
        />
        Mastrify Assistant
      </button>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[75] flex justify-end">
            <motion.button
              type="button"
              aria-label="Close assistant"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.25 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="mastrify-assistant-title"
              className="relative flex h-full w-full max-w-[min(100%,420px)] flex-col border-l border-white/[0.1] bg-gradient-to-b from-[#101018] to-black shadow-[-24px_0_80px_rgba(0,0,0,0.55)]"
              initial={reduce ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "100%" }}
              transition={{ duration: 0.36, ease: EASE }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
                aria-hidden
              />

              <header className="shrink-0 border-b border-white/[0.08] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/65">
                      Mastrify
                    </p>
                    <h2 id="mastrify-assistant-title" className="text-lg font-semibold text-white/92">
                      Mastrify Assistant
                    </h2>
                    <p className="mt-1 text-[13px] leading-snug text-white/55">
                      Get help with mastering, settings and exports.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-white/55 transition hover:border-white/[0.18] hover:text-white/85"
                  >
                    Close
                  </button>
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
                {messages.length === 0 && !ticketMode ? (
                  <div className="space-y-4">
                    <p className="text-[12px] leading-relaxed text-white/45">
                      Answers come from the Help Center — mastering, Analyze, LUFS, downloads, and payments only.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ASSISTANT_START_SUGGESTIONS.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleSend(label)}
                          className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-left text-[12px] font-medium leading-snug text-white/82 transition hover:border-violet-400/30 hover:bg-violet-500/[0.08] hover:text-violet-100"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {inMasterSession ? (
                      <SessionContextStrip ctx={sessionContext} processingStatus={processingStatus} />
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[92%] rounded-2xl px-4 py-3 text-[14px] leading-[1.65] ${
                            msg.role === "user"
                              ? "bg-violet-600/90 text-white"
                              : "border border-white/[0.09] bg-white/[0.04] text-white/[0.88]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          {msg.role === "assistant" && msg.reply?.faqId ? (
                            <Link
                              href={`/help#${msg.reply.faqId}`}
                              className="mt-2 inline-block text-[12px] font-medium text-violet-200/90 underline-offset-2 hover:underline"
                              onClick={() => setOpen(false)}
                            >
                              Read more in Help Center →
                            </Link>
                          ) : null}
                          {msg.role === "assistant" && msg.reply?.suggestTicket ? (
                            <button
                              type="button"
                              onClick={() => openTicketForm(lastUserQuery, msg.reply?.ticketCategory)}
                              className="mt-3 inline-flex min-h-[40px] items-center rounded-lg border border-violet-400/35 bg-violet-500/15 px-4 text-[12px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
                            >
                              Create support ticket
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {ticketMode ? (
                  <form onSubmit={submitTicket} className="mt-4 space-y-3 rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
                    <p className="text-[13px] font-semibold text-white/90">Create support ticket</p>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                        Category
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value as SupportTicketCategory)}
                        className="mt-1.5 w-full rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2 text-sm text-white/90 outline-none focus:border-violet-400/45"
                      >
                        {Object.entries(SUPPORT_CATEGORY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={ticketEmail}
                        onChange={(e) => setTicketEmail(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2 text-sm text-white/90 outline-none focus:border-violet-400/45"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                        What happened?
                      </label>
                      <textarea
                        required
                        minLength={10}
                        rows={4}
                        value={ticketBody}
                        onChange={(e) => setTicketBody(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2 text-sm text-white/90 outline-none focus:border-violet-400/45"
                      />
                    </div>
                    <SessionContextStrip ctx={sessionContext} processingStatus={processingStatus} />
                    {ticketError ? <p className="text-sm text-rose-300/90">{ticketError}</p> : null}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={ticketSubmitting}
                        className="min-h-[42px] flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {ticketSubmitting ? "Sending…" : "Submit ticket"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketMode(false)}
                        className="rounded-lg border border-white/[0.1] px-4 text-sm text-white/55"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>

              {inMasterSession && messages.length > 0 ? (
                <div className="shrink-0 border-t border-white/[0.06] px-5 py-3">
                  <SessionContextStrip ctx={sessionContext} processingStatus={processingStatus} />
                </div>
              ) : null}

              <footer className="shrink-0 border-t border-white/[0.08] p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about mastering, LUFS, downloads…"
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.11] bg-black/40 px-4 py-2.5 text-[14px] text-white/90 outline-none placeholder:text-white/35 focus:border-violet-400/45 focus:ring-2 focus:ring-violet-500/15"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-white/35">
                  <Link href="/help" className="text-violet-200/60 hover:text-violet-100" onClick={() => setOpen(false)}>
                    Full Help Center
                  </Link>
                </p>
              </footer>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
