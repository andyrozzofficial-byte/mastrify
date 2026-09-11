import type { AdminSupportPriority, AdminSupportStatus } from "./adminTypes"
import { isAdminSupportPriority, isAdminSupportStatus } from "./adminTypes"
import { ingestDebug, ingestError } from "./adminIngestDebug"
import { createSupabaseServerClient, getSupabaseKeySource } from "./supabaseServer"

const SUPPORT_INBOX_TABLE = "admin_support_inbox"
import type { SupportSessionContext, SupportThreadMessage, SupportTicketCategory } from "./supportTypes"
import { categoryLabel, isSupportTicketCategory } from "./supportTypes"
import { sendSupportReplyEmail } from "./sendSupportReplyEmail"

function isMissingSupportNameColumn(message: string): boolean {
  return /admin_support_inbox/i.test(message) && /\bname\b/i.test(message) && /does not exist/i.test(message)
}

function missingSupportInboxColumn(message: string): string | null {
  const match = message.match(/column\s+admin_support_inbox\.(\w+)\s+does not exist/i)
  return match?.[1] ?? null
}

function stripSupportInsertColumn(row: Record<string, unknown>, column: string): Record<string, unknown> {
  if (!(column in row)) return row
  const next = { ...row }
  delete next[column]
  return next
}

function newThreadId(): string {
  return crypto.randomUUID()
}

function parseThread(raw: unknown): SupportThreadMessage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (m): m is SupportThreadMessage =>
        m &&
        typeof m === "object" &&
        typeof (m as SupportThreadMessage).id === "string" &&
        typeof (m as SupportThreadMessage).body === "string",
    )
    .map((m) => ({
      id: m.id,
      author: m.author === "admin" ? "admin" : "user",
      body: m.body,
      created_at: m.created_at ?? new Date().toISOString(),
    }))
}

function priorityForCategory(category: SupportTicketCategory): AdminSupportPriority {
  if (category === "processing" || category === "bug") return "high"
  if (category === "master_quality") return "medium"
  return "medium"
}

function formatSessionBlock(ctx: SupportSessionContext | null | undefined): string {
  if (!ctx || Object.keys(ctx).length === 0) return ""
  const lines: string[] = ["--- Session context ---"]
  if (ctx.sessionId) lines.push(`Session ID: ${ctx.sessionId}`)
  if (ctx.trackName) lines.push(`Track: ${ctx.trackName}`)
  if (ctx.masteringStyle) lines.push(`Style: ${ctx.masteringStyle}`)
  if (ctx.lufs != null) lines.push(`LUFS: ${ctx.lufs}`)
  if (ctx.processingTimeMs != null) lines.push(`Processing: ${(ctx.processingTimeMs / 1000).toFixed(1)}s`)
  if (ctx.fileId) lines.push(`File ID: ${ctx.fileId}`)
  if (ctx.pathname) lines.push(`Page: ${ctx.pathname}`)
  if (ctx.errorLogs?.length) lines.push(`Errors:\n${ctx.errorLogs.join("\n")}`)
  return lines.length > 1 ? `\n\n${lines.join("\n")}` : ""
}

function normalizeSupportStatus(raw: unknown): AdminSupportStatus {
  if (typeof raw !== "string") return "open"
  if (isAdminSupportStatus(raw)) return raw
  if (raw === "new") return "open"
  if (raw === "read") return "waiting_for_customer"
  return "open"
}

function normalizeSupportPriority(raw: unknown): AdminSupportPriority {
  return typeof raw === "string" && isAdminSupportPriority(raw) ? raw : "medium"
}

export function mapSupportRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    subject: row.subject ? String(row.subject) : null,
    message: String(row.message),
    status: normalizeSupportStatus(row.status),
    priority: normalizeSupportPriority(row.priority),
    source: row.source ? String(row.source) : "manual",
    admin_notes: row.admin_notes ? String(row.admin_notes) : null,
    category: row.category ? String(row.category) : "general",
    session_context: (row.session_context as SupportSessionContext) ?? {},
    thread: parseThread(row.thread),
  }
}

export async function createPublicSupportTicket(input: {
  email: string
  name?: string | null
  category: string
  message: string
  sessionContext?: SupportSessionContext | null
}): Promise<{ id: string } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    ingestError("POST /api/support/tickets", { stage: "client", reason: "no_supabase_client" })
    return { error: "Support is temporarily unavailable" }
  }

  const email = input.email.trim()
  const message = input.message.trim()
  if (!email || !message) return { error: "Email and message are required" }
  if (!isSupportTicketCategory(input.category)) return { error: "Invalid category" }

  const category = input.category
  const ctx = input.sessionContext ?? {}
  const fullMessage = message + formatSessionBlock(ctx)
  const createdAt = new Date().toISOString()
  const thread: SupportThreadMessage[] = [
    { id: newThreadId(), author: "user", body: message, created_at: createdAt },
  ]

  const subject = `${categoryLabel(category)} — ${ctx.trackName?.trim() || "Mastrify support"}`

  ingestDebug("POST /api/support/tickets", {
    stage: "insert",
    table: SUPPORT_INBOX_TABLE,
    email,
    category,
    keySource: getSupabaseKeySource(),
    messageLength: message.length,
  })

  const baseRow: Record<string, unknown> = {
    email,
    subject,
    message: fullMessage,
    category,
    session_context: ctx,
    thread,
    source: "help_center",
    status: "open",
    priority: priorityForCategory(category),
  }

  let row: Record<string, unknown> = { ...baseRow, name: input.name?.trim() || null }
  let data: { id: string } | null = null
  let error: { message: string } | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await supabase.from(SUPPORT_INBOX_TABLE).insert([row]).select("id").single()
    data = res.data as { id: string } | null
    error = res.error
    if (!error) break
    const missing = missingSupportInboxColumn(error.message)
    if (!missing) break
    const nextRow = stripSupportInsertColumn(row, missing)
    if (nextRow === row) break
    row = nextRow
  }

  if (error) {
    ingestError("POST /api/support/tickets", {
      stage: "insert",
      table: SUPPORT_INBOX_TABLE,
      message: error.message,
      keySource: getSupabaseKeySource(),
    })
    return { error: error.message }
  }
  ingestDebug("POST /api/support/tickets", {
    stage: "insert_ok",
    table: SUPPORT_INBOX_TABLE,
    id: data?.id ?? null,
    keySource: getSupabaseKeySource(),
  })
  if (!data?.id) return { error: "Support ticket created but no id returned" }
  return { id: data.id }
}

export async function appendSupportReply(
  ticketId: string,
  body: string,
  author: "user" | "admin",
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const trimmed = body.trim()
  if (!trimmed) return { error: "Message is required" }

  const { data: row, error: fetchErr } = await supabase
    .from(SUPPORT_INBOX_TABLE)
    .select("thread, status, email, subject")
    .eq("id", ticketId)
    .maybeSingle()

  if (fetchErr) return { error: fetchErr.message }
  if (!row) return { error: "Ticket not found" }

  if (author === "admin") {
    const emailResult = await sendSupportReplyEmail({
      to: String(row.email ?? ""),
      subject: row.subject ? String(row.subject) : null,
      message: trimmed,
      ticketId,
    })
    if (!emailResult.sent) return { error: emailResult.error }
  }

  const thread = parseThread(row.thread)
  thread.push({
    id: newThreadId(),
    author,
    body: trimmed,
    created_at: new Date().toISOString(),
  })

  const nextStatus: AdminSupportStatus =
    author === "admin" ? "waiting_for_customer" : "open"

  const { error } = await supabase
    .from(SUPPORT_INBOX_TABLE)
    .update({
      thread,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)

  if (error) return { error: error.message }
  return { ok: true }
}
