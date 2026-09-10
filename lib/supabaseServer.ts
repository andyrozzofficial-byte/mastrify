import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export { supabaseTimed, beginDbRoute, endDbRoute } from "./supabaseTimed"

const DEFAULT_SUPABASE_URL = "https://wyuxkmrnzqvlqshlqfiw.supabase.co"

/** Server-side Supabase URL (public project URL). */
export function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    DEFAULT_SUPABASE_URL
  )
}

export type SupabaseKeySource = "service_role" | "anon" | "public_anon" | "none"

/** Prefer service role on the server; fall back to anon for RLS insert policies. */
export function getSupabaseServerKey(): string | null {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (service) return service
  const anon = process.env.SUPABASE_ANON_KEY?.trim()
  if (anon) return anon
  const publicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (publicAnon) return publicAnon
  return null
}

export function getSupabaseKeySource(): SupabaseKeySource {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return "service_role"
  if (process.env.SUPABASE_ANON_KEY?.trim()) return "anon"
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) return "public_anon"
  return "none"
}

/** Dev-only: which env vars are set (never logs secret values). */
export function getSupabaseEnvStatus() {
  return {
    url: getSupabaseUrl(),
    keySource: getSupabaseKeySource(),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()),
    hasPublicUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY?.trim()),
    hasPublicAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  }
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
