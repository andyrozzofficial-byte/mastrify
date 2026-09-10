/**
 * Canonical completed-master counts.
 *
 * SOURCE OF TRUTH: `beta_master_completions` (one row per session_id, PK on session_id).
 * Written only by `recordBetaMasterCompletion()` after a real master finishes.
 *
 * NOT used for completion counts (enrichment / legacy UI only):
 * - `admin_pipeline_events` (`master_complete`) — funnel analytics, must not inflate KPIs
 * - `admin_master_jobs` — admin job board mirror; upserted from completions, not counted separately
 * - `beta_master_feedback` — feedback sessions; separate from master completion
 */
import {
  BETA_MASTER_COMPLETIONS_TABLE,
  type BetaMasterCompletionRow,
} from "./betaMasterTracking"
import { createSupabaseServerClient } from "./supabaseServer"
import { statsDebug } from "./statsDebug"

export { BETA_MASTER_COMPLETIONS_TABLE }

export function countDistinctCanonicalCompletions(
  rows: BetaMasterCompletionRow[],
): number {
  const sessions = new Set(
    rows.map((c) => c.session_id).filter((sid): sid is string => Boolean(sid?.trim())),
  )
  return sessions.size
}

/** Dashboard KPI + admin totals — completions with completed_at on/after `sinceIso`. */
export async function countCanonicalMastersCompletedSince(
  sinceIso: string,
): Promise<number> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from(BETA_MASTER_COMPLETIONS_TABLE)
    .select("session_id", { count: "exact", head: true })
    .gte("completed_at", sinceIso)

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return 0
    console.error("[canonical-masters] count since failed", error.message)
    return 0
  }

  const total = count ?? 0
  statsDebug("canonical masters count", { sinceIso, total, source: BETA_MASTER_COMPLETIONS_TABLE })
  return total
}
