import { publicBackendUrl } from "./publicBackendUrl"

export function resolveAbsoluteMasterUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith("/")) return publicBackendUrl(url)
  return url
}

export function isRailwayMasterFileUrl(url: string): boolean {
  return /\/masters\/[^/?#]+/i.test(url)
}

export function masterFileDownloadUrl(url: string): string {
  const absolute = resolveAbsoluteMasterUrl(url)
  if (!isRailwayMasterFileUrl(absolute)) return absolute
  try {
    const parsed = new URL(absolute)
    parsed.searchParams.set("download", "1")
    return parsed.toString()
  } catch {
    const joiner = absolute.includes("?") ? "&" : "?"
    return `${absolute}${joiner}download=1`
  }
}

export function masterFileDownloadName(url: string, trackTitle?: string | null): string {
  const match = url.match(/\/([^/?#]+\.(?:wav|mp3|aiff?|flac))(?:[?#]|$)/i)
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }
  const safe = (trackTitle || "master").replace(/[^\w.\-]+/g, "_").slice(0, 80)
  return `${safe}_master.wav`
}

export async function triggerMasterFileDownload(url: string, filename: string): Promise<void> {
  const absolute = resolveAbsoluteMasterUrl(url)

  if (isRailwayMasterFileUrl(absolute)) {
    const anchor = document.createElement("a")
    anchor.href = masterFileDownloadUrl(absolute)
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    return
  }

  const res = await fetch(absolute)
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = blobUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
