import { randomUUID } from "crypto"
import {
  computeDiscountedCents,
  formatUsdFromCents,
  MASTER_PRICE_CENTS,
} from "./pricing"
import { createSupabaseServerClient } from "./supabaseServer"

export const DISCOUNT_CODES_TABLE = "discount_codes"
export const DISCOUNT_REDEMPTIONS_TABLE = "discount_redemptions"

export type DiscountCodeRow = {
  id: string
  code: string
  percent_off: number
  active: boolean
  valid_from: string | null
  valid_until: string | null
  max_uses: number | null
  use_count: number
  created_at: string
  updated_at: string
}

export type ValidatedDiscount = {
  id: string
  code: string
  percentOff: number
  originalCents: number
  finalCents: number
  originalLabel: string
  finalLabel: string
  isFree: boolean
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase()
}

function isWithinValidity(row: DiscountCodeRow, now = new Date()): boolean {
  if (row.valid_from) {
    const from = new Date(row.valid_from)
    if (!Number.isNaN(from.getTime()) && now < from) return false
  }
  if (row.valid_until) {
    const until = new Date(row.valid_until)
    if (!Number.isNaN(until.getTime()) && now > until) return false
  }
  return true
}

function hasUsesRemaining(row: DiscountCodeRow): boolean {
  if (row.max_uses == null) return true
  return row.use_count < row.max_uses
}

export function toValidatedDiscount(row: DiscountCodeRow): ValidatedDiscount {
  const finalCents = computeDiscountedCents(MASTER_PRICE_CENTS, row.percent_off)
  return {
    id: row.id,
    code: row.code,
    percentOff: row.percent_off,
    originalCents: MASTER_PRICE_CENTS,
    finalCents,
    originalLabel: formatUsdFromCents(MASTER_PRICE_CENTS),
    finalLabel: formatUsdFromCents(finalCents),
    isFree: finalCents === 0,
  }
}

export async function fetchDiscountCodeByNormalizedCode(
  normalizedCode: string,
): Promise<DiscountCodeRow | null> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from(DISCOUNT_CODES_TABLE)
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle()

  if (error) {
    console.error("[discount] fetch code failed:", error.message)
    return null
  }
  return (data as DiscountCodeRow | null) ?? null
}

export async function validateDiscountCodeInput(
  rawCode: string,
): Promise<{ ok: true; discount: ValidatedDiscount } | { ok: false; error: string }> {
  const code = normalizePromoCode(rawCode)
  if (!code || code.length < 3) {
    return { ok: false, error: "Enter a valid discount code." }
  }

  const row = await fetchDiscountCodeByNormalizedCode(code)
  if (!row) return { ok: false, error: "This discount code is not valid." }
  if (!row.active) return { ok: false, error: "This discount code is no longer active." }
  if (!isWithinValidity(row)) return { ok: false, error: "This discount code has expired or is not active yet." }
  if (!hasUsesRemaining(row)) return { ok: false, error: "This discount code has reached its usage limit." }

  return { ok: true, discount: toValidatedDiscount(row) }
}

async function redemptionExistsForObject(codeId: string, objectKey: string): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return false
  const { data } = await supabase
    .from(DISCOUNT_REDEMPTIONS_TABLE)
    .select("id")
    .eq("code_id", codeId)
    .eq("object_key", objectKey)
    .maybeSingle()
  return Boolean(data?.id)
}

export async function redeemFreeDiscountCode(params: {
  rawCode: string
  objectKey: string
}): Promise<
  | { ok: true; freeOrderId: string; discount: ValidatedDiscount }
  | { ok: false; error: string; status?: number }
> {
  const objectKey = params.objectKey.trim()
  if (!objectKey) return { ok: false, error: "Missing master reference.", status: 400 }

  const validated = await validateDiscountCodeInput(params.rawCode)
  if (!validated.ok) return { ok: false, error: validated.error, status: 400 }
  if (!validated.discount.isFree) {
    return { ok: false, error: "This code requires checkout. Apply it and continue to payment.", status: 400 }
  }

  const supabase = createSupabaseServerClient()
  if (!supabase) return { ok: false, error: "Discount codes are temporarily unavailable.", status: 503 }

  if (await redemptionExistsForObject(validated.discount.id, objectKey)) {
    const { data: existing } = await supabase
      .from(DISCOUNT_REDEMPTIONS_TABLE)
      .select("free_order_id")
      .eq("code_id", validated.discount.id)
      .eq("object_key", objectKey)
      .maybeSingle()
    if (existing?.free_order_id) {
      return {
        ok: true,
        freeOrderId: String(existing.free_order_id),
        discount: validated.discount,
      }
    }
  }

  const row = await fetchDiscountCodeByNormalizedCode(validated.discount.code)
  if (!row || !row.active || !isWithinValidity(row) || !hasUsesRemaining(row)) {
    return { ok: false, error: "This discount code is no longer valid.", status: 400 }
  }

  const freeOrderId = `free_${randomUUID()}`
  const nextUseCount = row.use_count + 1

  const { data: updatedRows, error: updateError } = await supabase
    .from(DISCOUNT_CODES_TABLE)
    .update({ use_count: nextUseCount, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("use_count", row.use_count)
    .select("id")

  if (updateError || !updatedRows?.length) {
    return { ok: false, error: "Could not apply discount code. Please try again.", status: 409 }
  }

  const { error: insertError } = await supabase.from(DISCOUNT_REDEMPTIONS_TABLE).insert([
    {
      code_id: row.id,
      code: row.code,
      object_key: objectKey,
      percent_off: row.percent_off,
      final_amount_cents: 0,
      free_order_id: freeOrderId,
    },
  ])

  if (insertError) {
    console.error("[discount] free redeem insert failed:", insertError.message)
    await supabase
      .from(DISCOUNT_CODES_TABLE)
      .update({ use_count: row.use_count, updated_at: new Date().toISOString() })
      .eq("id", row.id)
    return { ok: false, error: "Could not apply discount code.", status: 500 }
  }

  return { ok: true, freeOrderId, discount: validated.discount }
}

export async function recordStripeDiscountRedemption(params: {
  rawCode: string
  objectKey: string
  stripeSessionId: string
  finalAmountCents: number
  email?: string | null
}): Promise<void> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return

  const stripeSessionId = params.stripeSessionId.trim()
  const objectKey = params.objectKey.trim()
  if (!stripeSessionId || !objectKey) return

  const { data: existing } = await supabase
    .from(DISCOUNT_REDEMPTIONS_TABLE)
    .select("id")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle()
  if (existing?.id) return

  const validated = await validateDiscountCodeInput(params.rawCode)
  if (!validated.ok) return

  const row = await fetchDiscountCodeByNormalizedCode(validated.discount.code)
  if (!row) return

  const { error: insertError } = await supabase.from(DISCOUNT_REDEMPTIONS_TABLE).insert([
    {
      code_id: row.id,
      code: row.code,
      object_key: objectKey,
      percent_off: row.percent_off,
      final_amount_cents: params.finalAmountCents,
      stripe_session_id: stripeSessionId,
      email: params.email?.trim() || null,
    },
  ])

  if (insertError) {
    if (insertError.code === "23505") return
    console.error("[discount] stripe redemption insert failed:", insertError.message)
    return
  }

  await supabase
    .from(DISCOUNT_CODES_TABLE)
    .update({
      use_count: row.use_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
}

export async function verifyFreeOrderForObjectKey(
  freeOrderId: string,
  objectKey: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return { ok: false, status: 503, error: "Discount verification unavailable" }
  }

  const id = freeOrderId.trim()
  const key = objectKey.trim()
  if (!id.startsWith("free_")) {
    return { ok: false, status: 400, error: "Invalid free order reference" }
  }
  if (!key) return { ok: false, status: 400, error: "Missing objectKey" }

  const { data, error } = await supabase
    .from(DISCOUNT_REDEMPTIONS_TABLE)
    .select("id, object_key, final_amount_cents")
    .eq("free_order_id", id)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, status: 402, error: "Free order could not be verified" }
  }
  if (String(data.object_key) !== key) {
    return { ok: false, status: 403, error: "Free order does not match this master" }
  }
  if (Number(data.final_amount_cents) !== 0) {
    return { ok: false, status: 402, error: "Invalid free order amount" }
  }

  return { ok: true }
}

// --- Admin CRUD ---

export async function fetchAllDiscountCodes(): Promise<DiscountCodeRow[] | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { data, error } = await supabase
    .from(DISCOUNT_CODES_TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return { error: error.message }
  return (data as DiscountCodeRow[]) ?? []
}

export async function createDiscountCode(input: {
  code: string
  percentOff: number
  active?: boolean
  validFrom?: string | null
  validUntil?: string | null
  maxUses?: number | null
}): Promise<{ row: DiscountCodeRow } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const code = normalizePromoCode(input.code)
  const percentOff = Math.round(input.percentOff)
  if (!code || code.length < 3) return { error: "Code must be at least 3 characters." }
  if (percentOff < 0 || percentOff > 100) return { error: "Percent must be between 0 and 100." }

  const { data, error } = await supabase
    .from(DISCOUNT_CODES_TABLE)
    .insert([
      {
        code,
        percent_off: percentOff,
        active: input.active ?? true,
        valid_from: input.validFrom || null,
        valid_until: input.validUntil || null,
        max_uses: input.maxUses ?? null,
      },
    ])
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { row: data as DiscountCodeRow }
}

export async function updateDiscountCode(
  id: string,
  patch: Partial<{
    active: boolean
    percentOff: number
    validFrom: string | null
    validUntil: string | null
    maxUses: number | null
  }>,
): Promise<{ row: DiscountCodeRow } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.active !== undefined) update.active = patch.active
  if (patch.percentOff !== undefined) update.percent_off = Math.round(patch.percentOff)
  if (patch.validFrom !== undefined) update.valid_from = patch.validFrom
  if (patch.validUntil !== undefined) update.valid_until = patch.validUntil
  if (patch.maxUses !== undefined) update.max_uses = patch.maxUses

  const { data, error } = await supabase
    .from(DISCOUNT_CODES_TABLE)
    .update(update)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { row: data as DiscountCodeRow }
}

export async function deleteDiscountCode(id: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { error } = await supabase.from(DISCOUNT_CODES_TABLE).delete().eq("id", id)
  if (error) return { error: error.message }
  return { ok: true }
}
