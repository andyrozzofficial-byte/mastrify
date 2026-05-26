/**
 * Mastrify server debug flags — production stays silent unless env is exactly "1".
 */
export function isMastrifyDebugOn(raw) {
  return raw === "1"
}

export const MASTRIFY_MASTER_DEBUG = isMastrifyDebugOn(process.env.MASTRIFY_MASTER_DEBUG)
export const MASTRIFY_PIPELINE_DEBUG = isMastrifyDebugOn(process.env.MASTRIFY_PIPELINE_DEBUG)
export const MASTRIFY_LUFS_TRACE = isMastrifyDebugOn(process.env.MASTRIFY_LUFS_TRACE)
export const MASTRIFY_CHAIN_DEBUG = isMastrifyDebugOn(process.env.MASTRIFY_CHAIN_DEBUG)
/** Railway resource investigation — RAM, egress, job timing (temporary; set to 1 on Railway). */
export const MASTRIFY_RESOURCE_DEBUG = isMastrifyDebugOn(process.env.MASTRIFY_RESOURCE_DEBUG)
