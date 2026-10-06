/**
 * Ljudfilens identitet (format, filändelse, MIME) bestäms av innehållet, inte av vad klienten skickar.
 *
 * Bakgrund: Android kan lämna över en uppladdad fil med namn som "1", "audio:1000123" eller "msf:42",
 * utan filändelse och med MIME-typen "" eller "application/octet-stream" (eller varianter som
 * "audio/x-wav", "audio/wave", "audio/vnd.wave"). iPhone och desktop skickar oftast "låt.wav" + "audio/wav".
 * Allt detta ska normaliseras likadant så att en WAV alltid förblir en WAV genom hela kedjan.
 */
import fs from "fs"
import path from "path"

const FORMATS = {
  wav: { ext: ".wav", mime: "audio/wav" },
  aiff: { ext: ".aiff", mime: "audio/aiff" },
  flac: { ext: ".flac", mime: "audio/flac" },
  ogg: { ext: ".ogg", mime: "audio/ogg" },
  mp3: { ext: ".mp3", mime: "audio/mpeg" },
  m4a: { ext: ".m4a", mime: "audio/mp4" },
  caf: { ext: ".caf", mime: "audio/x-caf" },
}

/** Känner igen ljudformat på filens första byte. Returnerar { format, ext, mime } eller null. */
export function sniffAudioFormat(buf) {
  if (!buf || buf.length < 12) return null
  const ascii = (start, len) => buf.toString("latin1", start, start + len)
  const head4 = ascii(0, 4)
  if ((head4 === "RIFF" || head4 === "RF64" || head4 === "BW64") && ascii(8, 4) === "WAVE") return { format: "wav", ...FORMATS.wav }
  if (head4 === "FORM" && (ascii(8, 4) === "AIFF" || ascii(8, 4) === "AIFC")) return { format: "aiff", ...FORMATS.aiff }
  if (head4 === "fLaC") return { format: "flac", ...FORMATS.flac }
  if (head4 === "OggS") return { format: "ogg", ...FORMATS.ogg }
  if (head4 === "caff") return { format: "caf", ...FORMATS.caf }
  if (ascii(4, 4) === "ftyp") return { format: "m4a", ...FORMATS.m4a }
  if (ascii(0, 3) === "ID3") return { format: "mp3", ...FORMATS.mp3 }
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && (buf[1] & 0x06) !== 0) return { format: "mp3", ...FORMATS.mp3 }
  return null
}

/** Läser de första byten av en fil på disk och känner igen formatet. */
export function sniffAudioFile(filePath) {
  let fd
  try {
    fd = fs.openSync(filePath, "r")
    const buf = Buffer.alloc(64)
    const n = fs.readSync(fd, buf, 0, buf.length, 0)
    return sniffAudioFormat(buf.subarray(0, n))
  } catch {
    return null
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd) } catch { /* ignore */ }
  }
}

const WAV_MIME_ALIASES = new Set(["audio/wav", "audio/x-wav", "audio/wave", "audio/x-wave", "audio/vnd.wave", "audio/vnd.wav", "audio/x-pn-wav"])

/** Kanonisk MIME-typ för en WAV-variant ("audio/x-wav" m.fl. -> "audio/wav"); annars värdet i gemener. */
export function canonicalAudioMime(mime) {
  const value = String(mime || "").toLowerCase().split(";")[0].trim()
  if (WAV_MIME_ALIASES.has(value)) return "audio/wav"
  return value
}

const AUDIO_EXT_RE = /\.(wav|wave|mp3|mpeg|m4a|flac|aiff?|aac|ogg|opus|caf)$/i

/** "Låt.wav" -> "Låt", "1" -> "1". Tar bara bort en ljudändelse, inget annat. */
export function stripAudioExtension(name) {
  return String(name || "").trim().replace(AUDIO_EXT_RE, "")
}

function safeFileBase(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ._()-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[\s._-]+|[\s._-]+$/g, "")
    .slice(0, 80)
    .trim()
}

/**
 * Städar ett färdigt filnamn (t.ex. från ?name= i en nedladdningslänk) och garanterar ändelsen .wav.
 * "Låt_master.wav" -> "Lat_master.wav", "x" -> "x.wav", "" -> "Mastrify_master.wav".
 */
export function safeWavFileName(fileName) {
  const base = safeFileBase(stripAudioExtension(path.basename(String(fileName || ""))))
  return `${base || "Mastrify_master"}.wav`
}

/**
 * Filnamnet den färdiga mastern får när den laddas ner: alltid "<titel>_master.wav".
 * Titeln rensas till tecken som fungerar i filnamn på alla system och i en URL-parameter
 * (Supabase lägger den i ?download=... och HTTP-svaret i Content-Disposition).
 */
export function masterDownloadFileName(trackTitle) {
  const base = safeFileBase(stripAudioExtension(path.basename(String(trackTitle || ""))))
  return `${base || "Mastrify"}_master.wav`
}

/** Content-Disposition med både enkel och RFC 5987-variant av filnamnet. */
export function attachmentContentDisposition(fileName) {
  const ascii = String(fileName).replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

/**
 * Multer-middleware som körs direkt efter upload.single("file"): bestämmer formatet på innehållet,
 * ger den tillfälliga filen rätt ändelse (Android-filer utan ändelse sparades tidigare alltid som .wav,
 * oavsett innehåll) och sätter req.file.mimetype till den kanoniska typen. Loggar vad som kom in och
 * vad det blev, så att kedjan går att följa i Railway-loggen.
 */
export function normalizeUploadedAudio(req, _res, next) {
  const file = req.file
  if (!file || !file.path) return next()
  const incoming = { originalname: file.originalname, mimetype: file.mimetype, size: file.size }
  const detected = sniffAudioFile(file.path)
  const currentExt = path.extname(file.filename || "").toLowerCase()
  if (detected) {
    const sameFamily = currentExt === detected.ext || (detected.format === "wav" && currentExt === ".wave") || (detected.format === "aiff" && currentExt === ".aif")
    if (!sameFamily) {
      const renamed = path.join(path.dirname(file.path), `${path.parse(file.filename).name}${detected.ext}`)
      try {
        fs.renameSync(file.path, renamed)
        file.path = renamed
        file.filename = path.basename(renamed)
      } catch (err) {
        console.warn("[upload] could not rename upload to detected extension:", err?.message || err)
      }
    }
    file.mimetype = detected.mime
  } else {
    file.mimetype = canonicalAudioMime(file.mimetype)
  }
  file.detectedFormat = detected ? detected.format : null
  console.log("[upload] audio file identity", {
    originalname: incoming.originalname,
    mimetypeIn: incoming.mimetype,
    size: incoming.size,
    detected: file.detectedFormat,
    stored: file.filename,
    mimetype: file.mimetype,
  })
  next()
}
