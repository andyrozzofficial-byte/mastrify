"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  type SupportTicketCategory,
} from "../../../lib/supportTypes"
import { btnMastrifyPrimaryCore } from "../buttonEffects"

const EASE = [0.22, 1, 0.36, 1] as const

const inputClass =
  "w-full rounded-xl border border-white/[0.1] bg-black/30 px-4 py-3 text-[14px] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:border-violet-400/35 focus:ring-1 focus:ring-violet-400/20"

export default function SupportContactForm() {
  const reduce = useReducedMotion()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState<SupportTicketCategory>("other")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, category, message }),
      })
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not send your message. Please try again.")
        return
      }
      setTicketId(json.id ?? "submitted")
      setMessage("")
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (ticketId) {
    return (
      <motion.div
        className="relative overflow-hidden rounded-[1.35rem] border border-emerald-400/20 bg-gradient-to-b from-emerald-500/[0.08] to-black/[0.78] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:px-8 md:py-9"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/70">Ticket received</p>
        <p className="mt-4 text-[1.05rem] font-medium leading-snug text-white/92">
          Your support request is in our queue. We typically reply within one business day.
        </p>
        <p className="mx-auto mt-3 max-w-[20rem] text-[13px] leading-relaxed text-white/55">
          Reference: <span className="font-mono text-white/70">{ticketId.slice(0, 8)}</span>
        </p>
      </motion.div>
    )
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.11] bg-gradient-to-b from-white/[0.05] to-black/[0.78] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(167,139,250,0.1),0_24px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:px-8 md:py-9"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/28 to-transparent"
        aria-hidden
      />
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.26em] text-label-strong">
        Submit a support ticket
      </p>
      <p className="mx-auto mt-3 max-w-[22rem] text-center text-[13px] leading-relaxed text-muted">
        Goes directly to our support inbox. Include your track name and what you need help with.
      </p>

      <div className="mx-auto mt-6 max-w-[22rem] space-y-3.5 text-left">
        <div>
          <label htmlFor="support-email" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
            Email
          </label>
          <input
            id="support-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="support-name" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
            Name <span className="normal-case tracking-normal text-white/35">(optional)</span>
          </label>
          <input
            id="support-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="support-category" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
            Topic
          </label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
            className={`${inputClass} appearance-none`}
          >
            {SUPPORT_TICKET_CATEGORIES.map((key) => (
              <option key={key} value={key} className="bg-[#0a0a0f]">
                {SUPPORT_CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="support-message" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
            Message
          </label>
          <textarea
            id="support-message"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} min-h-[6.5rem] resize-y`}
            placeholder="Describe your issue — track name, export timing, or payment reference if relevant."
          />
        </div>

        {error ? <p className="text-[13px] leading-snug text-rose-300/90">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className={`stable-interaction w-full rounded-xl px-5 py-3 text-[14px] font-semibold ${btnMastrifyPrimaryCore}`}
        >
          {submitting ? "Sending…" : "Send support request"}
        </button>
      </div>
    </motion.form>
  )
}
