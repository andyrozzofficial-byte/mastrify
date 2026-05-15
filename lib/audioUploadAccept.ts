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

export function isAcceptedAudioUpload(file: File): boolean {
  const mime = file.type.toLowerCase().trim()
  const ext = getAudioFileExtension(file.name)

  if (mime.startsWith("video/")) return false

  if (mime.startsWith("audio/")) return true

  if (ext && AUDIO_EXTENSIONS.has(ext)) return true

  // Files / iCloud / DAW exports often arrive with an empty or generic MIME on iOS.
  if ((mime === "" || mime === "application/octet-stream") && ext && AUDIO_EXTENSIONS.has(ext)) {
    return true
  }

  return false
}

export const AUDIO_UPLOAD_REJECT_MESSAGE =
  "Please choose an audio file (WAV, MP3, FLAC, AIFF, M4A, or similar) from Files or your export folder."
