export const SUPPORT_TICKET_CATEGORIES = [
  "processing",
  "master_quality",
  "payment",
  "bug",
  "other",
] as const

export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number]

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  processing: "Processing problem",
  master_quality: "Master sounds wrong",
  payment: "Payment / account",
  bug: "Bug",
  other: "Other",
}

export type SupportSessionContext = {
  sessionId?: string | null
  trackName?: string | null
  masteringStyle?: string | null
  lufs?: number | null
  processingTimeMs?: number | null
  fileId?: string | null
  errorLogs?: string[]
  pathname?: string | null
}

export type SupportThreadMessage = {
  id: string
  author: "user" | "admin"
  body: string
  created_at: string
}

export function isSupportTicketCategory(v: string): v is SupportTicketCategory {
  return (SUPPORT_TICKET_CATEGORIES as readonly string[]).includes(v)
}

export function categoryLabel(category: string | null | undefined): string {
  if (!category || !isSupportTicketCategory(category)) return "Support"
  return SUPPORT_CATEGORY_LABELS[category]
}
