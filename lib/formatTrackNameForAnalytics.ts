import { parseTrackDisplayName } from "./parseTrackDisplayName"

/** Display name for analytics from upload filename metadata. */
export function formatTrackNameForAnalytics(fileName: string | null | undefined): string | null {
  if (!fileName || !fileName.trim()) return null
  const { title, artist } = parseTrackDisplayName(fileName)
  if (artist) return `${artist} - ${title}`
  return title || null
}
