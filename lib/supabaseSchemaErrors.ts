/** User-facing hint when PostgREST / Postgres reports a missing table. */
export function formatSupabaseTableError(table: string, message: string, code?: string | null): string {
  const raw = `${code ?? ""} ${message}`.toLowerCase()
  const missing =
    raw.includes("schema cache") ||
    raw.includes("does not exist") ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01"

  if (!missing || !raw.includes(table.replace("public.", ""))) {
    return message
  }

  if (table.includes("admin_customer_profiles")) {
    return "Beta profiles database is not set up yet. Apply supabase/admin_customer_profiles.sql in the Supabase SQL Editor, wait ~10 seconds, then try again."
  }

  return `Database table "${table}" is missing. Apply the matching SQL in supabase/ and reload the schema cache.`
}
