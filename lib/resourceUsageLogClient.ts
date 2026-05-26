/**
 * Client-side correlation logs for Railway resource investigation.
 * Enable with NEXT_PUBLIC_MASTRIFY_RESOURCE_DEBUG=1
 */
import { isMastrifyDebugOn } from "./mastrifyDebug"

const env = typeof process !== "undefined" ? process.env : undefined

export const MASTRIFY_CLIENT_RESOURCE_DEBUG = isMastrifyDebugOn(
  env?.NEXT_PUBLIC_MASTRIFY_RESOURCE_DEBUG
)

const PREFIX = "[resource-client]"

export function logResourceClient(event: string, fields: Record<string, unknown> = {}) {
  if (!MASTRIFY_CLIENT_RESOURCE_DEBUG) return
  console.log(PREFIX, event, { at: new Date().toISOString(), ...fields })
}
