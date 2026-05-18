/** Shared 30s preview window in the original upload timeline (seconds). */
export const PREVIEW_START = 60
export const PREVIEW_DURATION = 30
export const PREVIEW_END = PREVIEW_START + PREVIEW_DURATION
export const MOBILE_FADE_OUT_SECONDS = 3

export type PreviewSource = "original" | "mastered"

/** Mobile mastered MP3 is a pre-cut clip (0–30s), not the full file. */
export function isMasteredClipPlayback(source: PreviewSource, isMobile: boolean): boolean {
  return isMobile && source === "mastered"
}

/** Map element currentTime → absolute timeline (PREVIEW_START…PREVIEW_END). */
export function elementTimeToAbsolute(
  source: PreviewSource,
  elementTime: number,
  isMobile: boolean
): number {
  if (!Number.isFinite(elementTime)) return PREVIEW_START
  if (isMasteredClipPlayback(source, isMobile)) {
    return PREVIEW_START + Math.max(0, elementTime)
  }
  return elementTime
}

/** Map absolute timeline → element currentTime for a given source. */
export function absoluteToElementTime(
  source: PreviewSource,
  absoluteSec: number,
  opts?: { duration?: number; isMobile?: boolean }
): number {
  const isMobile = opts?.isMobile ?? false
  const clamped = Math.max(PREVIEW_START, Math.min(PREVIEW_END, absoluteSec))
  if (isMasteredClipPlayback(source, isMobile)) {
    return Math.max(0, Math.min(PREVIEW_DURATION, clamped - PREVIEW_START))
  }
  const dur = opts?.duration
  if (dur != null && Number.isFinite(dur) && dur > 0) {
    return Math.min(clamped, Math.max(PREVIEW_START, dur - 0.1))
  }
  return clamped
}

export function progressPercentFromAbsolute(absoluteSec: number): number {
  const p = ((absoluteSec - PREVIEW_START) / PREVIEW_DURATION) * 100
  return Math.max(0, Math.min(100, p))
}

export function absoluteFromProgressPercent(progressPercent: number): number {
  const p = Math.max(0, Math.min(100, progressPercent)) / 100
  return PREVIEW_START + p * PREVIEW_DURATION
}

export function safePreviewStartForDuration(duration: number | undefined): number {
  if (duration != null && Number.isFinite(duration) && duration > 0) {
    return Math.min(PREVIEW_START, Math.max(0, duration - 0.1))
  }
  return PREVIEW_START
}
