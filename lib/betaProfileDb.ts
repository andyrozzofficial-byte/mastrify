import type { SupabaseClient } from "@supabase/supabase-js"
import { CUSTOMER_PROFILES_TABLE } from "./adminData"
import { createSupabaseServerClient } from "./supabaseServer"
import { formatSupabaseTableError } from "./supabaseSchemaErrors"

const LOG_PREFIX = "[beta]"

const PROFILE_SELECT_FULL =
  "email, name, genre, daw, beta_rank, beta_signed_up_at, notes, beta_approved, created_at, updated_at"
const PROFILE_SELECT_BETA = "email, name, genre, daw, beta_rank, beta_signed_up_at, created_at"
const PROFILE_SELECT_MINIMAL = "email, name, created_at, updated_at"

export type BetaCustomerProfileRecord = {
  email: string
  name: string | null
  genre: string | null
  daw: string | null
  beta_rank: string | null
  beta_signed_up_at: string | null
  notes: string | null
  beta_approved: boolean
  created_at: string | null
  updated_at: string | null
}

function parseMissingColumnFromError(message: string): string | null {
  const m =
    message.match(/Could not find the '([^']+)' column/i) ??
    message.match(/column "([^"]+)" of relation/i) ??
    message.match(/column ([a-z_][a-z0-9_]*) does not exist/i)
  return m?.[1] ?? null
}

function isMissingSchemaError(message: string, code?: string | null): boolean {
  const raw = `${code ?? ""} ${message}`.toLowerCase()
  return (
    raw.includes("schema cache") ||
    raw.includes("does not exist") ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01"
  )
}

function mapProfileRow(row: Record<string, unknown>): BetaCustomerProfileRecord {
  return {
    email: String(row.email ?? ""),
    name: (row.name as string | null) ?? null,
    genre: (row.genre as string | null) ?? null,
    daw: (row.daw as string | null) ?? null,
    beta_rank: (row.beta_rank as string | null) ?? null,
    beta_signed_up_at: (row.beta_signed_up_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    beta_approved: Boolean(row.beta_approved),
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  }
}

/** Load profile with progressively smaller column sets when schema is behind migrations. */
export async function findBetaProfileByEmail(
  email: string,
  supabase?: SupabaseClient | null,
): Promise<BetaCustomerProfileRecord | null> {
  const client = supabase ?? createSupabaseServerClient()
  if (!client) return null

  const selects = [PROFILE_SELECT_FULL, PROFILE_SELECT_BETA, PROFILE_SELECT_MINIMAL, "email"]

  for (const columns of selects) {
    const { data, error } = await client
      .from(CUSTOMER_PROFILES_TABLE)
      .select(columns)
      .eq("email", email)
      .maybeSingle()

    if (!error && data) {
      return mapProfileRow(data as Record<string, unknown>)
    }

    if (error && !isMissingSchemaError(error.message, error.code)) {
      console.error(`${LOG_PREFIX} find profile failed:`, error.message)
      return null
    }
  }

  return null
}

/** Upsert with automatic retry when optional beta columns are missing from schema cache. */
export async function upsertCustomerProfileRow(
  body: Record<string, unknown>,
  supabase?: SupabaseClient | null,
): Promise<{ ok: true } | { error: string }> {
  const client = supabase ?? createSupabaseServerClient()
  if (!client) return { error: "Database unavailable" }

  const record: Record<string, unknown> = { ...body }
  const maxAttempts = 12

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await client.from(CUSTOMER_PROFILES_TABLE).upsert(record, { onConflict: "email" })

    if (!error) return { ok: true }

    const missingCol = parseMissingColumnFromError(error.message ?? "")
    if (missingCol && missingCol in record) {
      console.warn(`${LOG_PREFIX} omitting missing profile column "${missingCol}"`)
      delete record[missingCol]
      continue
    }

    return {
      error: formatSupabaseTableError(CUSTOMER_PROFILES_TABLE, error.message, error.code),
    }
  }

  return { error: "Could not save profile after schema fallback" }
}
