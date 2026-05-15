/**
 * Mastrify client debug flags — production stays silent unless env is exactly "1".
 * Do not use truthy checks (e.g. "true") so accidental env values stay off.
 */
export function isMastrifyDebugOn(raw: string | undefined): boolean {
  return raw === "1"
}

const env = typeof process !== "undefined" ? process.env : undefined

export const MASTRIFY_CLIENT_LUFS_TRACE = isMastrifyDebugOn(env?.NEXT_PUBLIC_MASTRIFY_LUFS_TRACE)
export const MASTRIFY_CLIENT_PIPELINE_DEBUG = isMastrifyDebugOn(env?.NEXT_PUBLIC_MASTRIFY_PIPELINE_DEBUG)

/** Preview playback console logs — gated with pipeline debug (no separate prod default). */
export const MASTRIFY_CLIENT_PREVIEW_DEBUG = MASTRIFY_CLIENT_PIPELINE_DEBUG
