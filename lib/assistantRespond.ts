import { HELP_FAQ_ITEMS, searchHelpFaq, type HelpFaqItem } from "./helpFaq"
import type { SupportSessionContext, SupportTicketCategory } from "./supportTypes"

export type AssistantConfidence = "high" | "low"

export type AssistantReply = {
  answer: string
  confidence: AssistantConfidence
  faqId?: string
  suggestTicket: boolean
  ticketCategory?: SupportTicketCategory
  outOfScope?: boolean
}

/** Scoped to Mastrify product — not a general AI assistant */
const SCOPE_TERMS = [
  "master",
  "mastering",
  "mastrify",
  "analyze",
  "analysis",
  "lufs",
  "loudness",
  "stereo",
  "width",
  "warm",
  "balanced",
  "stream",
  "club",
  "download",
  "export",
  "preview",
  "payment",
  "pay",
  "stripe",
  "processing",
  "upload",
  "track",
  "audio",
  "wav",
  "settings",
  "style",
  "preset",
  "bass",
  "low end",
  "clarity",
  "presence",
  "support",
  "ticket",
  "help",
  "bug",
  "error",
  "session",
]

const SUGGESTION_FAQ_ID: Record<string, string> = {
  "why is my track still processing?": "still-processing",
  "what is lufs?": "what-is-lufs",
  "download my master": "download-master",
  "master sounds wrong": "preview-vs-full",
  "payment help": "payment-issue",
}

const CANNED_SUGGESTIONS: Record<string, { answer: string; category?: SupportTicketCategory }> = {
  "master sounds wrong": {
    answer:
      "Use the A/B toggle on your result page to compare the master with your mix. Try a different style preset (Warm vs Balanced) or small clarity/low-end tweaks. If preview and export sound different, or the tone still feels wrong after A/B, we can review your session — create a ticket and we'll take a listen.",
    category: "master_quality",
  },
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ")
}

function faqById(id: string): HelpFaqItem | undefined {
  return HELP_FAQ_ITEMS.find((i) => i.id === id)
}

function scoreFaq(item: HelpFaqItem, query: string): number {
  const q = normalizeQuery(query)
  if (!q) return 0
  const question = item.question.toLowerCase()
  const answer = item.answer.toLowerCase()
  let score = 0
  if (question.includes(q) || q.includes(question.slice(0, 20))) score += 12
  const tokens = q.split(/\s+/).filter((t) => t.length > 1)
  for (const token of tokens) {
    if (item.keywords.some((k) => k.includes(token) || token.includes(k))) score += 4
    if (answer.includes(token)) score += 1
    if (question.includes(token)) score += 3
  }
  return score
}

function bestFaqMatch(query: string): { item: HelpFaqItem; score: number } | null {
  const fromSearch = searchHelpFaq(query)
  const candidates = fromSearch.length > 0 ? fromSearch : HELP_FAQ_ITEMS
  let best: { item: HelpFaqItem; score: number } | null = null
  for (const item of candidates) {
    const score = scoreFaq(item, query)
    if (!best || score > best.score) best = { item, score }
  }
  return best && best.score > 0 ? best : null
}

function isInScope(query: string): boolean {
  const q = normalizeQuery(query)
  if (!q) return false
  if (q.includes("contact support") || q === "support" || q.includes("human")) return true
  return SCOPE_TERMS.some((term) => q.includes(term))
}

function inferTicketCategory(query: string): SupportTicketCategory {
  const q = normalizeQuery(query)
  if (/pay|payment|stripe|charge|receipt|refund/.test(q)) return "payment"
  if (/process|stuck|loading|slow|spinner|wait/.test(q)) return "processing"
  if (/bug|error|crash|broken|glitch/.test(q)) return "bug"
  if (/wrong|harsh|dull|quality|bad|off|weird/.test(q)) return "master_quality"
  if (/analyze|analysis|metric/.test(q)) return "other"
  return "other"
}

function replyFromFaq(item: HelpFaqItem, category?: SupportTicketCategory): AssistantReply {
  return {
    answer: item.answer,
    confidence: "high",
    faqId: item.id,
    suggestTicket: false,
    ticketCategory: category,
  }
}

/**
 * Rule-based Help Center answers — no external AI.
 */
export function respondAssistant(query: string): AssistantReply {
  const q = normalizeQuery(query)
  if (!q) {
    return {
      answer: "Ask about mastering, LUFS, downloads, payments, or processing — or pick a suggestion above.",
      confidence: "low",
      suggestTicket: false,
    }
  }

  if (q === "contact support" || q === "contact" || q === "talk to support") {
    return {
      answer:
        "I can connect you with the Mastrify team. Create a support ticket below and we'll follow up by email — your mastering session details attach automatically when you're in a session.",
      confidence: "low",
      suggestTicket: true,
      ticketCategory: "other",
    }
  }

  if (!isInScope(q)) {
    return {
      answer:
        "I'm the Mastrify Assistant — I help with mastering, Analyze, audio settings, LUFS, downloads, payments, and support. For general questions outside the product, visit our Help Center or open a ticket.",
      confidence: "low",
      suggestTicket: true,
      outOfScope: true,
      ticketCategory: "other",
    }
  }

  const suggestionId = SUGGESTION_FAQ_ID[q]
  if (suggestionId) {
    const item = faqById(suggestionId)
    if (item) {
      const canned = CANNED_SUGGESTIONS[q]
      if (canned) {
        return {
          answer: canned.answer,
          confidence: "high",
          faqId: item.id,
          suggestTicket: false,
          ticketCategory: canned.category,
        }
      }
      return replyFromFaq(item)
    }
  }

  const canned = CANNED_SUGGESTIONS[q]
  if (canned) {
    return {
      answer: canned.answer,
      confidence: "high",
      suggestTicket: false,
      ticketCategory: canned.category,
    }
  }

  const match = bestFaqMatch(query)
  if (match && match.score >= 5) {
    return replyFromFaq(match.item, inferTicketCategory(q))
  }

  if (match && match.score >= 2) {
    return {
      answer: `${match.item.answer}\n\nIf this doesn't solve it, I can open a support ticket for you.`,
      confidence: "low",
      faqId: match.item.id,
      suggestTicket: true,
      ticketCategory: inferTicketCategory(q),
    }
  }

  return {
    answer:
      "I couldn't find a confident answer in our Help Center for that. Would you like to create a support ticket? We'll attach your session details if you're mastering.",
    confidence: "low",
    suggestTicket: true,
    ticketCategory: inferTicketCategory(q),
  }
}

export const ASSISTANT_START_SUGGESTIONS = [
  "Why is my track still processing?",
  "What is LUFS?",
  "Download my master",
  "Master sounds wrong",
  "Payment help",
  "Contact support",
] as const

export function processingStatusLabel(
  pathname: string | null,
  opts: {
    sessionId?: string | null
    masteredUrl?: string
    processingTimeMs?: number | null
  },
): string | null {
  if (!pathname?.startsWith("/master") && !opts.sessionId) return null
  if (pathname?.includes("/processing")) return "Processing in progress"
  if (opts.masteredUrl || pathname?.includes("/result")) {
    if (opts.processingTimeMs != null && Number.isFinite(opts.processingTimeMs)) {
      return `Complete (${(opts.processingTimeMs / 1000).toFixed(1)}s)`
    }
    return "Complete"
  }
  if (opts.sessionId) return "Session active"
  return null
}
