"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
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

const QUICK_SUGGESTIONS = [
  "What is LUFS?",
  "Why is my track still processing?",
  "Download my master",
  "Master sounds wrong",
  "Payment help",
] as const

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  reply?: AssistantReply
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AnswerParagraphs({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).filter(Boolean)
  return (
    <div className="space-y-2">
      {parts.map((part, i) => (
        <p key={i}>{part}</p>
      ))}
    </div>
  )
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
    <div className="rounded-lg border border-violet-400/20 bg-violet-500/[0.08] px-2.5 py-2 text-[10px] leading-snug text-violet-100/85">
      <p className="font-semibold uppercase tracking-[0.14em] text-violet-200/70">Session attached</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((line) => (
          <li key={line} className="truncate">
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuickSuggestions({
  compact,
  onPick,
}: {
  compact?: boolean
  onPick: (label: string) => void
}) {
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-col gap-1.5"}>
      {QUICK_SUGGESTIONS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(label)}
          className={
            compact
              ? "rounded-full border border-white/[0.09] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/75 transition hover:border-violet-400/28 hover:bg-violet-500/[0.08] hover:text-violet-100"
              : "rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-left text-[12px] font-medium text-white/78 transition hover:border-violet-400/28 hover:bg-violet-500/[0.08] hover:text-violet-100"
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function MastrifyAssistant() {
  const reduce = useReducedMotion()
  const pathname = usePathname()
  const master = useMasterSession()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
  const [pageScrolled, setPageScrolled] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

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
  const hasMessages = messages.length > 0

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const syncViewport = () => setIsMobileViewport(mq.matches)
    syncViewport()
    mq.addEventListener("change", syncViewport)
    return () => mq.removeEventListener("change", syncViewport)
  }, [])

  useEffect(() => {
    const onScroll = () => setPageScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, ticketMode, open, scrollToBottom])

  const appendExchange = useCallback((userText: string) => {
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
  }, [])

  function handleSend(text?: string) {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return
    setInput("")
    if (inputRef.current) inputRef.current.style.height = ""
    setLastUserQuery(trimmed)
    appendExchange(trimmed)
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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
        text: `Ticket received — we'll reply to ${ticketEmail} soon.`,
      },
    ])
  }

  const messageMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: EASE },
      }

  const fabCompact = isMobileViewport && pageScrolled && !open

  return (
    <div className="pointer-events-none fixed bottom-[max(7.75rem,calc(7.75rem+env(safe-area-inset-bottom)))] right-[max(1.5rem,env(safe-area-inset-right))] z-[70] flex flex-col items-end max-md:max-w-[calc(100vw-3.5rem)] md:bottom-[3.25rem] md:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="chat"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mastrify-assistant-title"
            className="pointer-events-auto flex h-[min(400px,calc(100dvh-12rem))] w-[min(340px,calc(100vw-2rem))] max-h-[min(420px,calc(100dvh-11rem))] flex-col overflow-hidden rounded-[20px] border border-white/[0.12] bg-[rgba(12,12,18,0.88)] shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-xl backdrop-saturate-150 md:h-[min(440px,calc(100dvh-6rem))] md:max-h-[460px] md:w-[min(340px,calc(100vw-3rem))]"
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-400/90 shadow-[0_0_5px_rgba(52,211,153,0.38)]"
                  aria-hidden
                />
                <h2 id="mastrify-assistant-title" className="truncate text-[14px] font-semibold text-white/92">
                  Mastrify Assistant
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white/90"
              >
                <CloseIcon />
              </button>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {!ticketMode ? (
                <div className="space-y-3 border-b border-white/[0.06] pb-3">
                  {!hasMessages ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[13px] leading-snug text-white/[0.88]">
                      Hi 👋 Need help with mastering?
                    </div>
                  ) : null}
                  <QuickSuggestions compact={hasMessages} onPick={handleSend} />
                </div>
              ) : null}

              {hasMessages ? (
                <div className="mt-3 space-y-2.5">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        layout
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        {...messageMotion}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-[1.5] ${
                            msg.role === "user"
                              ? "bg-violet-600/95 text-white"
                              : "border border-white/[0.08] bg-white/[0.04] text-white/[0.86]"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <AnswerParagraphs text={msg.text} />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          )}
                          {msg.role === "assistant" ? (
                            <Link
                              href={msg.reply?.faqId ? `/help#${msg.reply.faqId}` : "/help"}
                              className="mt-2 inline-block text-[11px] font-medium text-violet-200/90 transition hover:text-violet-100 hover:underline"
                              onClick={() => setOpen(false)}
                            >
                              Open Help Center →
                            </Link>
                          ) : null}
                          {msg.role === "assistant" && msg.reply?.suggestTicket ? (
                            <button
                              type="button"
                              onClick={() => openTicketForm(lastUserQuery, msg.reply?.ticketCategory)}
                              className="mt-2 inline-flex min-h-[32px] items-center rounded-lg border border-violet-400/35 bg-violet-500/15 px-3 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
                            >
                              Create ticket
                            </button>
                          ) : null}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : null}

              {!hasMessages && inMasterSession && !ticketMode ? (
                <div className="mt-3">
                  <SessionContextStrip ctx={sessionContext} processingStatus={processingStatus} />
                </div>
              ) : null}

              {ticketMode ? (
                <form onSubmit={submitTicket} className="mt-3 space-y-2 rounded-xl border border-white/[0.1] bg-white/[0.03] p-3">
                  <p className="text-[12px] font-semibold text-white/90">Support ticket</p>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as SupportTicketCategory)}
                    className="w-full rounded-lg border border-white/[0.1] bg-black/50 px-2.5 py-1.5 text-[12px] text-white/90 outline-none focus:border-violet-500/28"
                  >
                    {Object.entries(SUPPORT_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={ticketEmail}
                    onChange={(e) => setTicketEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-black/50 px-2.5 py-1.5 text-[12px] text-white/90 outline-none focus:border-violet-500/28"
                  />
                  <textarea
                    required
                    minLength={10}
                    rows={3}
                    placeholder="Describe the issue"
                    value={ticketBody}
                    onChange={(e) => setTicketBody(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-black/50 px-2.5 py-1.5 text-[12px] text-white/90 outline-none focus:border-violet-500/28"
                  />
                  <SessionContextStrip ctx={sessionContext} processingStatus={processingStatus} />
                  {ticketError ? <p className="text-[11px] text-rose-300/90">{ticketError}</p> : null}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="min-h-[36px] flex-1 rounded-lg bg-violet-600 text-[12px] font-semibold text-white disabled:opacity-60"
                    >
                      {ticketSubmitting ? "Sending…" : "Submit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketMode(false)}
                      className="rounded-lg border border-white/[0.1] px-3 text-[12px] text-white/55"
                    >
                      Back
                    </button>
                  </div>
                </form>
              ) : null}

              {inMasterSession && hasMessages && !ticketMode ? (
                <div className="mt-2">
                  <SessionContextStrip ctx={sessionContext} processingStatus={processingStatus} />
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-white/[0.08] p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 88)}px`
                  }}
                  onKeyDown={onInputKeyDown}
                  placeholder="Ask about mastering..."
                  className="max-h-[88px] min-h-[40px] min-w-0 flex-1 resize-none rounded-xl border border-white/[0.1] bg-black/45 px-3 py-2 text-[13px] leading-snug text-white/90 outline-none placeholder:text-white/35 focus:border-violet-500/28"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="mb-0.5 shrink-0 rounded-xl bg-indigo-800/95 px-3.5 py-2 text-[12px] font-semibold text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.2)] ring-1 ring-violet-950/30 transition hover:bg-indigo-700/95 disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            </footer>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Mastrify Assistant"
          className={`pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.035] font-semibold text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_24px_rgba(0,0,0,0.32)] ring-1 ring-white/[0.04] transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white active:scale-[0.98] ${
            fabCompact
              ? "h-12 w-12 p-0 md:h-auto md:w-auto md:gap-2 md:px-3.5 md:py-2 md:text-[12px]"
              : "h-[52px] max-h-[54px] gap-2 px-3.5 py-2 text-[12px] md:h-auto md:max-h-none"
          }`}
          whileTap={reduce ? undefined : { scale: 0.98 }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-violet-300/70 md:h-1.5 md:w-1.5"
            aria-hidden
          />
          <span className={fabCompact ? "sr-only md:not-sr-only md:inline" : "inline"}>Mastrify Assistant</span>
        </motion.button>
      ) : null}
    </div>
  )
}
