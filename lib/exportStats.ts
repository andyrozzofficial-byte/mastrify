import { createSupabaseServerClient } from "./supabaseServer"

export const DEFAULT_PAID_EXPORT_CENTS = 900

/** Row shape from mastered_exports (+ optional classification context). */
export type ExportRow = {
  id?: string
  email: string
  created_at: string
  amount_cents?: number | null
  track_title?: string | null
  object_key?: string | null
  stripe_session_id?: string | null
}

export type ExportClassificationContext = {
  freeObjectKeys: Set<string>
}

export async function fetchFreeExportObjectKeys(): Promise<Set<string>> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return new Set()

  const { data, error } = await supabase
    .from("discount_redemptions")
    .select("object_key")
    .eq("final_amount_cents", 0)

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return new Set()
    console.warn("[exportStats] discount_redemptions lookup failed:", error.message)
    return new Set()
  }

  return new Set(
    (data ?? [])
      .map((row) => (typeof row.object_key === "string" ? row.object_key.trim() : ""))
      .filter(Boolean),
  )
}

export async function loadExportClassificationContext(): Promise<ExportClassificationContext> {
  return { freeObjectKeys: await fetchFreeExportObjectKeys() }
}

/** 100% free export — includes known free redemptions with missing amount_cents. */
export function isFreeExport(row: ExportRow, ctx: ExportClassificationContext): boolean {
  const cents = row.amount_cents
  if (cents != null && Number.isFinite(Number(cents))) {
    return Number(cents) === 0
  }

  const objectKey = row.object_key?.trim()
  if (objectKey && ctx.freeObjectKeys.has(objectKey)) return true

  return false
}

/** Export that generated payment (full or partial discount, or legacy paid without amount_cents). */
export function isPaidExport(row: ExportRow, ctx: ExportClassificationContext): boolean {
  if (isFreeExport(row, ctx)) return false

  const cents = row.amount_cents
  if (cents != null && Number.isFinite(Number(cents))) {
    return Number(cents) > 0
  }

  // Legacy exports before amount tracking: treat as paid unless linked to a free redemption.
  return true
}

/** Actual USD revenue for an export row — never $9 for known free exports. */
export function exportRevenueUsd(row: ExportRow, ctx: ExportClassificationContext): number {
  if (isFreeExport(row, ctx)) return 0

  const cents = row.amount_cents
  if (cents != null && Number.isFinite(Number(cents))) {
    return Math.max(0, Number(cents)) / 100
  }

  // Legacy paid export without stored amount — default catalog price.
  return DEFAULT_PAID_EXPORT_CENTS / 100
}

export function countPaidExports(rows: ExportRow[], ctx: ExportClassificationContext): number {
  return rows.filter((row) => isPaidExport(row, ctx)).length
}

export function sumExportRevenueUsd(rows: ExportRow[], ctx: ExportClassificationContext): number {
  return rows.reduce((sum, row) => sum + exportRevenueUsd(row, ctx), 0)
}

export function groupExportsByEmail(rows: ExportRow[], ctx: ExportClassificationContext) {
  const exportCount = new Map<string, number>()
  const paidExportCount = new Map<string, number>()

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase()
    if (!email) continue
    exportCount.set(email, (exportCount.get(email) ?? 0) + 1)
    if (isPaidExport(row, ctx)) {
      paidExportCount.set(email, (paidExportCount.get(email) ?? 0) + 1)
    }
  }

  return { exportCount, paidExportCount }
}
