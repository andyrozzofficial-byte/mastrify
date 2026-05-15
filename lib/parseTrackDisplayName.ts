export type TrackDisplayMeta = {
  title: string
  artist: string | null
}

const EXT_RE = /\.(wav|mp3|flac|aiff|aif|m4a|ogg|wma|aac|caf|opus)$/i
const SEP_RE = /\s*[-–—|]\s+/

const TRAILING_NOISE_RE =
  /\s+(?:kopia|copy|copia|duplicate|final|finale|mastered|master|bounce|export|draft|demo|rough|new|untitled|render|stem|stems)(?:\s+v?\d+)?\s*$/i

const INLINE_NOISE_RE =
  /\b(?:kopia|copy|copia|duplicate|final|master\s*v?\d+|mastered|bounce|export|draft)\b/gi

const PAREN_NOISE_RE =
  /\s*[\(\[](?:mix|master|mastered|version|ver\.?\s*\d*|edit|demo|rough|bounce|radio|extended|instrumental)[\)\]]\s*/gi

function normalizeSpaces(s: string): string {
  return s.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim()
}

/** Title-case words while preserving acronyms and "&". */
function toDisplayTitle(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9&]+$/.test(word)) return word
      if (word.length <= 2) return word.toLowerCase()
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

function cleanSegment(segment: string): string {
  let s = normalizeSpaces(segment)
  s = s.replace(PAREN_NOISE_RE, " ")
  s = s.replace(INLINE_NOISE_RE, " ")
  let prev = ""
  while (prev !== s) {
    prev = s
    s = s.replace(TRAILING_NOISE_RE, "").trim()
  }
  s = s.replace(/^[\s._-]+|[\s._-]+$/g, "")
  return normalizeSpaces(s)
}

/**
 * Turn upload filenames into editorial track metadata (artist / title).
 */
export function parseTrackDisplayName(rawFilename: string): TrackDisplayMeta {
  const base = normalizeSpaces(rawFilename.replace(EXT_RE, ""))
  if (!base) return { title: "Your track", artist: null }

  const sep = base.match(SEP_RE)
  let artist: string | null = null
  let title = base

  if (sep && sep.index != null && sep.index > 0) {
    artist = cleanSegment(base.slice(0, sep.index))
    title = cleanSegment(base.slice(sep.index + sep[0].length))
    if (!title && artist) {
      title = artist
      artist = null
    }
  } else {
    title = cleanSegment(base)
  }

  title = toDisplayTitle(title || "Your track")
  if (artist) {
    artist = cleanSegment(artist)
    if (!artist) artist = null
  }

  return { title, artist }
}
