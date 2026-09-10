import type { ActionCenterIssue, IssueTier } from "./adminFeedbackActionCenter"
import type { AdminSupportRow } from "./adminTypes"

type SupportPattern = {
  id: string
  label: string
  keywords: string[]
  tier: IssueTier
}

const SUPPORT_PATTERNS: SupportPattern[] = [
  {
    id: "compression",
    label: "Too compressed",
    keywords: ["compress", "compressed", "squashed", "brick", "crushed", "over-limited"],
    tier: "critical",
  },
  {
    id: "thin",
    label: "Master sounds thin",
    keywords: ["thin", "weak", "hollow", "lifeless", "flat master", "no body"],
    tier: "medium",
  },
  {
    id: "processing-failed",
    label: "Processing failed",
    keywords: ["processing", "stuck", "failed", "error", "spinning", "loading forever", "timed out"],
    tier: "critical",
  },
  {
    id: "harsh",
    label: "Harsh / bright master",
    keywords: ["harsh", "bright", "sibilance", "painful", "sharp"],
    tier: "medium",
  },
  {
    id: "payment",
    label: "Payment / export issue",
    keywords: ["payment", "charged", "receipt", "download", "export", "email delivery"],
    tier: "medium",
  },
]

function ticketText(ticket: AdminSupportRow): string {
  const parts = [ticket.message, ticket.subject, ...ticket.thread.map((m) => m.body)]
  return parts.filter(Boolean).join(" ").toLowerCase()
}

function matchesPattern(text: string, pattern: SupportPattern): boolean {
  return pattern.keywords.some((kw) => text.includes(kw))
}

function withinDays(iso: string, days: number): boolean {
  const t = new Date(iso).getTime()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return t >= cutoff
}

function countPatternInTickets(tickets: AdminSupportRow[], pattern: SupportPattern): number {
  let n = 0
  for (const ticket of tickets) {
    if (matchesPattern(ticketText(ticket), pattern)) n += 1
  }
  return n
}

function formatDelta(recent: number, prior: number): string {
  if (prior === 0) return recent > 0 ? `(+${recent})` : ""
  const pct = Math.round(((recent - prior) / prior) * 100)
  if (pct > 0) return `(+${pct}%)`
  if (pct < 0) return `(${pct}%)`
  return ""
}

/**
 * Derive product signals from support ticket text (open + recent resolved).
 */
export function buildSupportActionSignals(tickets: AdminSupportRow[]): ActionCenterIssue[] {
  const active = tickets.filter((t) => t.status === "open" || t.status === "waiting_for_customer")
  const recent14 = tickets.filter((t) => withinDays(t.created_at, 14))
  const recent7 = tickets.filter((t) => withinDays(t.created_at, 7))
  const prior7 = tickets.filter(
    (t) => withinDays(t.created_at, 14) && !withinDays(t.created_at, 7),
  )

  const signals: ActionCenterIssue[] = []

  for (const pattern of SUPPORT_PATTERNS) {
    const total = countPatternInTickets(recent14, pattern)
    if (total < 2) continue

    const recent = countPatternInTickets(recent7, pattern)
    const prior = countPatternInTickets(prior7, pattern)
    const openMatches = countPatternInTickets(active, pattern)
    const delta = formatDelta(recent, prior)

    const mentions = Math.max(total, openMatches)
    const priorityScore = mentions * (pattern.tier === "critical" ? 3 : 2)
    const priorityLabel =
      priorityScore >= 9 ? "High" : priorityScore >= 4 ? "Medium" : ("Low" as const)

    const trend =
      recent > prior ? "increasing" : recent < prior ? "easing" : "steady"

    signals.push({
      id: `support-${pattern.id}`,
      tier: pattern.tier,
      emoji: "📩",
      label: pattern.label,
      mentions,
      priorityScore,
      priorityLabel,
      message: `Support pulse: “${pattern.label}” complaints ${trend} ${delta}`.trim(),
    })
  }

  signals.sort((a, b) => b.priorityScore - a.priorityScore || b.mentions - a.mentions)
  return signals.slice(0, 5)
}

export function mergeActionCenterItems(
  feedbackItems: ActionCenterIssue[],
  supportItems: ActionCenterIssue[],
): ActionCenterIssue[] {
  const seen = new Set<string>()
  const merged: ActionCenterIssue[] = []

  for (const item of [...supportItems, ...feedbackItems]) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
  }

  merged.sort((a, b) => b.priorityScore - a.priorityScore || b.mentions - a.mentions)
  return merged.slice(0, 10)
}
