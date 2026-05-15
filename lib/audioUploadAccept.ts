/**
 * iOS Safari does not handle `accept="audio/*"` reliably (WebKit #242110) and may
 * surface video/media instead of audio exports. Use explicit MIME types + extensions.
 */
export const AUDIO_UPLOAD_ACCEPT = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/flac",
  "audio/x-flac",
  "audio/aiff",
  "audio/x-aiff",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
  ".wav",
  ".wave",
  ".mp3",
  ".mpeg",
  ".m4a",
  ".flac",
  ".aiff",
  ".aif",
  ".aac",
  ".ogg",
  ".opus",
  ".caf",
].join(",")

const AUDIO_EXTENSIONS = new Set([
  "wav",
  "wave",
  "mp3",
  "mpeg",
  "m4a",
  "flac",
  "aiff",
  "aif",
  "aac",
  "ogg",
  "opus",
  "caf",
])

export function getAudioFileExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf(".")
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ""
}

const GENERIC_BINARY_MIMES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/x-binary",
])

/** iOS Files / UTType strings that are not `audio/*` but still denote audio. */
function mimeSuggestsAudio(mime: string): boolean {
  if (!mime) return false
  if (mime.startsWith("audio/")) return true
  if (mime === "public.audio" || mime === "public.mpeg-4-audio" || mime === "public.mp3") return true
  if (
    mime === "application/vnd.wave" ||
    mime === "application/x-wav" ||
    mime === "audio/vnd.wave"
  ) {
    return true
  }
  if (mime.includes("mpeg") || mime.includes("mp3") || mime.includes("wav") || mime.includes("flac")) {
    return true
  }
  return false
}

export function isAcceptedAudioUpload(file: File): boolean {
  const mime = file.type.toLowerCase().trim()
  const ext = getAudioFileExtension(file.name)

  if (mime.startsWith("video/")) return false

  if (mimeSuggestsAudio(mime)) return true

  if (ext && AUDIO_EXTENSIONS.has(ext)) return true

  // Files / iCloud / DAW exports often arrive with an empty or generic MIME on iOS.
  if ((mime === "" || GENERIC_BINARY_MIMES.has(mime)) && ext && AUDIO_EXTENSIONS.has(ext)) {
    return true
  }

  return false
}

export const AUDIO_UPLOAD_REJECT_MESSAGE =
  "Please choose an audio file (WAV, MP3, FLAC, AIFF, M4A, or similar) from Files or your export folder."
