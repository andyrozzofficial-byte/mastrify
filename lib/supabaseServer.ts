import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const DEFAULT_SUPABASE_URL = "https://wyuxkmrnzqvlqshlqfiw.supabase.co"

/** Server-side Supabase URL (public project URL). */
export function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    DEFAULT_SUPABASE_URL
  )
}

/** Prefer service role on the server; fall back to anon/publishable for local dev. */
export function getSupabaseServerKey(): string | null {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (service) return service
  const anon = process.env.SUPABASE_ANON_KEY?.trim()
  if (anon) return anon
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (publishable) return publishable
  return "sb_publishable_j-if6EVRN-M3q-DS5s4q_w_5K0Tiw3n"
}

export function createSupabaseServerClient(): SupabaseClient | null {
  const url = getSupabaseUrl()
  const key = getSupabaseServerKey()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const isSupabaseDevLogging =
  process.env.NODE_ENV === "development" || process.env.MASTRIFY_DEBUG === "1"
