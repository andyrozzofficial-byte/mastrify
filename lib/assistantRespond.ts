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

/** Short chat-style lines — not full FAQ paragraphs */
const CHAT_ANSWERS: Record<string, string[]> = {
  "what-is-lufs": [
    "LUFS measures how loud your track feels over time.",
    "Streaming platforms use it for level matching.",
    "Mastrify targets release-ready loudness without crushing your mix.",
  ],
  "stereo-width": [
    "Stereo Width controls how wide your mix feels left to right.",
    "Higher = more space on synths and guitars.",
    "Lower = tighter center for vocals, kick, and bass.",
    "Go subtle if your mix already has heavy stereo effects.",
  ],
  "warm-vs-balanced": [
    "Balanced (Streaming) = modern, even loudness and clear mids.",
    "Warm = softer highs and fuller low-mids — less bright overall.",
    "A/B on your chorus and pick what keeps vocals forward.",
  ],
  "still-processing": [
    "Most tracks finish within a minute on our engine.",
    "Longer files or high load can take a few minutes.",
    "Keep this tab open while processing runs.",
    "Over ~10 minutes? Refresh and check History — don't start duplicate jobs.",
  ],
  "download-master": [
    "When the preview sounds right, complete checkout on the result page.",
    "Your full-resolution export unlocks for download and email.",
    "Use the same browser session — exports link to your session ID.",
  ],
  "low-end-control": [
    "Low End Control tames sub and bass buildup.",
    "Too boomy? Turn it up a touch. Too thin? Turn it down.",
    "Always compare against your unmastered mix.",
  ],
  "clarity-presence": [
    "Clarity / Presence shapes upper mids — vocals, snare, guitars.",
    "A little more helps dull mixes cut through.",
    "Too much can sound harsh — use small moves and A/B on the result page.",
  ],
  "preview-vs-full": [
    "Preview = fast compressed stream for A/B on the site.",
    "Paid export = full-quality master file.",
    "Tone and loudness should match closely.",
  ],
  "payment-issue": [
    "Check your email (and spam) for the delivery link.",
    "Payments tie to the session that created the master.",
    "Charged but no download? Open a ticket with your receipt email.",
  ],
  "analyze-step": [
    "Analyze is optional but recommended.",
    "It shows LUFS, stereo balance, and suggestions before you master.",
    "You can also go straight to Master with your own settings.",
  ],
}

const CANNED_SUGGESTIONS: Record<string, { lines: string[]; category?: SupportTicketCategory }> = {
  "master sounds wrong": {
    lines: [
      "Use A/B on the result page — compare master vs your mix.",
      "Try Warm vs Balanced, or small clarity / low-end tweaks.",
      "Preview and export should match. Still off? We can review your session.",
    ],
    category: "master_quality",
  },
}

function linesToAnswer(lines: string[]): string {
  return lines.join("\n\n")
}

/** Split long FAQ prose into short chat lines (max 3–4 sentences). */
function splitToConversational(text: string): string {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const lines: string[] = []
  for (const s of sentences) {
    if (lines.length >= 4) break
    if (s.length <= 120) {
      lines.push(s)
    } else {
      const parts = s.split(/[,;—–-]\s+/).filter((p) => p.length > 10)
      for (const p of parts.slice(0, 2)) {
        if (lines.length >= 4) break
        lines.push(p.endsWith(".") ? p : `${p}.`)
      }
    }
  }
  return linesToAnswer(lines.length > 0 ? lines : [text.slice(0, 200)])
}

export function formatConversationalAnswer(text: string, faqId?: string): string {
  if (faqId && CHAT_ANSWERS[faqId]) return linesToAnswer(CHAT_ANSWERS[faqId])
  return splitToConversational(text)
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
    answer: formatConversationalAnswer(item.answer, item.id),
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
      answer: linesToAnswer([
        "Ask about mastering, LUFS, downloads, payments, or processing.",
        "Or tap a suggestion above to get started.",
      ]),
      confidence: "low",
      suggestTicket: false,
    }
  }

  if (q === "contact support" || q === "contact" || q === "talk to support") {
    return {
      answer: linesToAnswer([
        "I can connect you with the Mastrify team.",
        "Create a support ticket and we'll follow up by email.",
        "Session details attach automatically when you're mastering.",
      ]),
      confidence: "low",
      suggestTicket: true,
      ticketCategory: "other",
    }
  }

  if (!isInScope(q)) {
    return {
      answer: linesToAnswer([
        "I help with mastering, Analyze, settings, LUFS, downloads, and payments.",
        "For topics outside Mastrify, open the Help Center or a support ticket.",
      ]),
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
          answer: linesToAnswer(canned.lines),
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
      answer: linesToAnswer(canned.lines),
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
      answer: linesToAnswer([
        ...(CHAT_ANSWERS[match.item.id] ?? splitToConversational(match.item.answer).split("\n\n")),
        "If that doesn't help, I can open a support ticket for you.",
      ]),
      confidence: "low",
      faqId: match.item.id,
      suggestTicket: true,
      ticketCategory: inferTicketCategory(q),
    }
  }

  return {
    answer: linesToAnswer([
      "I couldn't find a strong match in our Help Center.",
      "Want to create a support ticket? We'll attach your session if you're mastering.",
    ]),
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
