"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useMasterSession } from "../master/MasterSessionProvider"
import {
  ContentPageLayout,
  ContentPageShell,
  PageHero,
} from "../components/content/ContentPageLayout"
import { HELP_FAQ_ITEMS, POPULAR_HELP_FAQ, searchHelpFaq, type HelpFaqItem } from "../../lib/helpFaq"
import { masteringStyleLabel } from "../../lib/masterStyleLabels"
import { readSupportSessionContext } from "../../lib/readSupportSessionContext"
import type { SupportSessionContext, SupportTicketCategory } from "../../lib/supportTypes"
import SupportTicketModal from "./SupportTicketModal"

const EASE = [0.22, 1, 0.36, 1] as const

function FaqCard({ item, highlight, compact }: { item: HelpFaqItem; highlight?: boolean; compact?: boolean }) {
  return (
    <article
      id={item.id}
      className={`rounded-[1.15rem] border transition duration-300 ${
        compact ? "px-4 py-3.5" : "px-5 py-4"
      } ${
        highlight
          ? "border-violet-400/35 bg-violet-500/[0.08] shadow-[0_0_0_1px_rgba(167,139,250,0.12)]"
          : "border-white/[0.09] bg-white/[0.03]"
      }`}
    >
      <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white/92">{item.question}</h3>
      <p className={`${compact ? "mt-2" : "mt-2.5"} text-[16px] leading-[1.8] text-white/[0.85]`}>{item.answer}</p>
    </article>
  )
}

function FaqNavButton({
  item,
  active,
  onSelect,
}: {
  item: HelpFaqItem
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-3.5 py-3 text-left text-[13px] font-medium leading-snug transition ${
        active
          ? "border-violet-400/40 bg-violet-500/[0.12] text-violet-100 shadow-[0_0_0_1px_rgba(167,139,250,0.15)]"
          : "border-white/[0.08] bg-white/[0.03] text-white/82 hover:border-violet-400/25 hover:bg-violet-500/[0.06] hover:text-violet-100"
      }`}
    >
      {item.question}
    </button>
  )
}

export default function HelpCenterClient() {
  const reduce = useReducedMotion()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const master = useMasterSession()

  const defaultFaqId = POPULAR_HELP_FAQ[0]?.id ?? HELP_FAQ_ITEMS[0]?.id ?? ""

  const [query, setQuery] = useState("")
  const [activeFaqId, setActiveFaqId] = useState(defaultFaqId)
  const [ticketModalOpen, setTicketModalOpen] = useState(searchParams.get("ticket") === "1")

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

  const activeFaq = useMemo(
    () => HELP_FAQ_ITEMS.find((i) => i.id === activeFaqId) ?? HELP_FAQ_ITEMS[0],
    [activeFaqId],
  )

  const selectFaq = useCallback((item: HelpFaqItem) => {
    setActiveFaqId(item.id)
    setQuery("")
  }, [])

  useEffect(() => {
    if (!showSearchResults || searchResults.length === 0) return
    setActiveFaqId(searchResults[0].id)
  }, [showSearchResults, searchResults])

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

  function closeTicketModal() {
    setTicketModalOpen(false)
    if (ticketSuccess) setTicketSuccess(false)
  }

  return (
    <ContentPageLayout>
      <ContentPageShell className="pb-16 pt-8 sm:pb-20 sm:pt-10 md:pt-12">
        <PageHero
          label="Help center"
          title="How can we help?"
          lead="Search common questions first — most answers are instant. Tickets are only when you still need a human."
        />

        <motion.div
          className="relative mx-auto mt-6 max-w-2xl"
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
            className="w-full rounded-[1.15rem] border border-white/[0.11] bg-black/40 px-5 py-3.5 text-[15px] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition placeholder:text-white/35 focus:border-violet-400/45 focus:ring-2 focus:ring-violet-500/20"
            autoComplete="off"
          />
        </motion.div>

        {showSearchResults ? (
          <section className="mx-auto mt-5 max-w-3xl space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-label-strong">
              {searchResults.length > 0 ? "Matching answers" : "No matches"}
            </p>
            {searchResults.length === 0 ? (
              <p className="text-[16px] leading-[1.8] text-white/[0.85]">Try different keywords, or browse topics below.</p>
            ) : (
              <div className="space-y-2.5">
                {searchResults.map((item) => (
                  <FaqCard key={item.id} item={item} highlight={activeFaqId === item.id} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="mt-6 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8">
            <aside className="lg:sticky lg:top-24">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-label-strong">
                Popular questions
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {POPULAR_HELP_FAQ.map((item) => (
                  <li key={item.id}>
                    <FaqNavButton
                      item={item}
                      active={activeFaqId === item.id}
                      onSelect={() => selectFaq(item)}
                    />
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-label-strong">
                All topics
              </p>
              <ul className="mt-3 hidden max-h-[min(50vh,420px)] flex-col gap-1.5 overflow-y-auto pr-1 lg:flex">
                {HELP_FAQ_ITEMS.map((item) => (
                  <li key={item.id}>
                    <FaqNavButton
                      item={item}
                      active={activeFaqId === item.id}
                      onSelect={() => selectFaq(item)}
                    />
                  </li>
                ))}
              </ul>
            </aside>

            <div className="mt-6 min-w-0 lg:mt-0">
              {activeFaq ? <FaqCard item={activeFaq} highlight /> : null}
              <div className="mt-5 space-y-2.5 lg:hidden">
                {HELP_FAQ_ITEMS.filter((i) => i.id !== activeFaqId).map((item) => (
                  <FaqCard key={item.id} item={item} compact />
                ))}
              </div>
            </div>
          </div>
        )}

        <section className="mx-auto mt-8 max-w-2xl rounded-[1.35rem] border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-black/[0.75] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:p-6">
          <h2 className="text-2xl font-semibold text-white/92">Still need help?</h2>
          <p className="mt-1.5 text-[16px] leading-[1.8] text-white/[0.85]">
            Create a support ticket and we&apos;ll follow up by email. Session details attach automatically when
            you&apos;re mastering.
          </p>
          <button
            type="button"
            onClick={() => {
              setTicketSuccess(false)
              setTicketModalOpen(true)
            }}
            className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-7 text-[13px] font-semibold text-white shadow-[0_14px_36px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.1] transition hover:brightness-[1.04] sm:w-auto"
          >
            Create support ticket
          </button>
          <p className="mt-4 text-center text-[12px] text-white/40">
            Prefer email only?{" "}
            <a href="mailto:hello@mastrify.com" className="text-violet-200/75 hover:text-violet-100">
              hello@mastrify.com
            </a>
          </p>
        </section>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[12px] text-white/38">
          <Link href="/master" className="text-violet-200/70 hover:text-violet-100">
            ← Back to mastering
          </Link>
        </p>
      </ContentPageShell>

      <SupportTicketModal
        open={ticketModalOpen}
        onClose={closeTicketModal}
        category={category}
        onCategoryChange={setCategory}
        email={email}
        onEmailChange={setEmail}
        name={name}
        onNameChange={setName}
        ticketMessage={ticketMessage}
        onTicketMessageChange={setTicketMessage}
        sessionContext={sessionContext}
        submitting={submitting}
        ticketError={ticketError}
        ticketSuccess={ticketSuccess}
        onSubmit={onSubmitTicket}
      />
    </ContentPageLayout>
  )
}
