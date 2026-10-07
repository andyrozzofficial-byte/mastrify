import { SITE_DOWNLOADS_TABLE } from "./adminData"
import { createSupabaseServerClient } from "./supabaseServer"
import { statsDebug } from "./statsDebug"

/** Installer download clicks on /tools. Anonymous: product, OS and (for Audio Tools) which plugin link was used. */

export const DOWNLOAD_PRODUCTS = ["audio_tools", "desktop"] as const
export const DOWNLOAD_OSES = ["mac", "windows"] as const
export const DOWNLOAD_PLUGINS = ["reference", "meter", "inspect"] as const

export type DownloadProduct = (typeof DOWNLOAD_PRODUCTS)[number]
export type DownloadOs = (typeof DOWNLOAD_OSES)[number]
export type DownloadPlugin = (typeof DOWNLOAD_PLUGINS)[number]

export type DownloadEvent = {
  product: DownloadProduct
  os: DownloadOs
  plugin: DownloadPlugin | null
}

function pick<T extends string>(allowed: readonly T[], raw: unknown): T | null {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw) ? (raw as T) : null
}

/** Only the fixed values are accepted; a plugin is only valid together with Audio Tools. */
export function parseDownloadEvent(body: Record<string, unknown>): DownloadEvent | null {
  const product = pick(DOWNLOAD_PRODUCTS, body.product)
  const os = pick(DOWNLOAD_OSES, body.os)
  if (!product || !os) return null
  const hasPlugin = body.plugin != null && body.plugin !== ""
  const plugin = hasPlugin ? pick(DOWNLOAD_PLUGINS, body.plugin) : null
  if (hasPlugin && (!plugin || product !== "audio_tools")) return null
  return { product, os, plugin }
}

export async function writeDownloadEvent(event: DownloadEvent): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient()
  if (!supabase) return { error: "Database unavailable" }

  const { error } = await supabase.from(SITE_DOWNLOADS_TABLE).insert({
    product: event.product,
    os: event.os,
    plugin: event.plugin,
  })

  if (error) {
    if (/does not exist|42P01/i.test(error.message)) return { error: "admin_site_downloads table missing" }
    return { error: error.message }
  }

  statsDebug("site download written", event)
  return { ok: true }
}
