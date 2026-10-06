// Kör: npm test   (från server/)
// Täcker att en WAV förblir en WAV oavsett vilket namn och vilken MIME-typ klienten skickar
// (Android: "1", "audio:1000123", "", "application/octet-stream", "audio/x-wav" ...).
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  sniffAudioFormat,
  canonicalAudioMime,
  stripAudioExtension,
  masterDownloadFileName,
  safeWavFileName,
  attachmentContentDisposition,
  normalizeUploadedAudio,
} from "../audioFileIdentity.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const wavBytes = fs.readFileSync(path.join(here, "..", "test1.wav"))

test("känner igen format på innehållet", () => {
  assert.equal(sniffAudioFormat(wavBytes).format, "wav")
  assert.equal(sniffAudioFormat(Buffer.from("RF64\0\0\0\0WAVEds64")).format, "wav")
  assert.equal(sniffAudioFormat(Buffer.from("ID3\x04\0\0\0\0\0\0\0\0")).format, "mp3")
  assert.equal(sniffAudioFormat(Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0])).format, "mp3")
  assert.equal(sniffAudioFormat(Buffer.from([0xff, 0xf1, 0x50, 0x80, 0, 0, 0, 0, 0, 0, 0, 0])), null, "AAC ADTS är inte MP3")
  assert.equal(sniffAudioFormat(Buffer.from("fLaC\0\0\0\x22\0\0\0\0")).format, "flac")
  assert.equal(sniffAudioFormat(Buffer.from("\0\0\0\x20ftypM4A \0\0")).format, "m4a")
  assert.equal(sniffAudioFormat(Buffer.from("FORM\0\0\0\0AIFFCOMM")).format, "aiff")
  assert.equal(sniffAudioFormat(Buffer.from("hello world!!")), null)
})

test("WAV-varianter av MIME blir audio/wav", () => {
  for (const m of ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave", "AUDIO/X-WAV; codecs=1"]) assert.equal(canonicalAudioMime(m), "audio/wav")
  assert.equal(canonicalAudioMime("audio/mpeg"), "audio/mpeg")
  assert.equal(canonicalAudioMime(""), "")
})

test("nedladdningsnamnet slutar alltid på .wav och är säkert", () => {
  assert.equal(masterDownloadFileName("Midnight Drive.wav"), "Midnight Drive_master.wav")
  assert.equal(masterDownloadFileName("1"), "1_master.wav")                     // Android-filnamn utan ändelse
  assert.equal(masterDownloadFileName("audio:1000123"), "audio_1000123_master.wav")
  assert.equal(masterDownloadFileName(""), "Mastrify_master.wav")
  assert.equal(masterDownloadFileName(null), "Mastrify_master.wav")
  assert.equal(masterDownloadFileName("Låt med åäö.WAV"), "Lat med aao_master.wav")
  assert.equal(masterDownloadFileName("a/b\\c?.mp3"), "b_c_master.wav")         // inga mappsteg, inga specialtecken
  assert.equal(masterDownloadFileName("x&y#z.wav"), "x_y_z_master.wav")      // inga tecken som bryter ?download=
  assert.ok(masterDownloadFileName("a".repeat(300)).length <= 80 + "_master.wav".length)
  assert.equal(stripAudioExtension("song.flac"), "song")
  assert.equal(stripAudioExtension("song.final"), "song.final")
})

test("färdigt filnamn städas utan att få extra _master, alltid .wav", () => {
  assert.equal(safeWavFileName("1_master.wav"), "1_master.wav")
  assert.equal(safeWavFileName("Mastrify_master.wav"), "Mastrify_master.wav")
  assert.equal(safeWavFileName("x"), "x.wav")
  assert.equal(safeWavFileName("evil\"name.mp3"), "evil_name.wav")
  assert.equal(safeWavFileName(""), "Mastrify_master.wav")
})

test("Content-Disposition har filnamn med .wav", () => {
  const h = attachmentContentDisposition("Låt_master.wav")
  assert.match(h, /^attachment; filename="L_t_master\.wav"; filename\*=UTF-8''L%C3%A5t_master\.wav$/)
})

function runMiddleware(originalname, mimetype, bytes, storedAs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mx-upload-"))
  const p = path.join(dir, storedAs)
  fs.writeFileSync(p, bytes)
  const req = { file: { originalname, mimetype, size: bytes.length, filename: storedAs, path: p } }
  let called = false
  normalizeUploadedAudio(req, {}, () => { called = true })
  assert.ok(called)
  return req.file
}

test("Android-uppladdning: WAV utan ändelse och med octet-stream blir .wav + audio/wav", () => {
  const f = runMiddleware("1", "application/octet-stream", wavBytes, "1700000000000.wav")
  assert.equal(f.filename, "1700000000000.wav")
  assert.equal(f.mimetype, "audio/wav")
  assert.equal(f.detectedFormat, "wav")
  assert.ok(fs.existsSync(f.path))
})

test("WAV med fel ändelse (.bin / .mp3) och tom MIME får rätt ändelse på disk", () => {
  for (const [name, stored] of [["track.bin", "1700000000001.bin"], ["track.mp3", "1700000000002.mp3"]]) {
    const f = runMiddleware(name, "", wavBytes, stored)
    assert.equal(path.extname(f.filename), ".wav")
    assert.equal(f.mimetype, "audio/wav")
    assert.ok(fs.existsSync(f.path))
  }
})

test("iPhone/desktop: låt.wav + audio/x-wav lämnas på plats, MIME normaliseras", () => {
  const f = runMiddleware("Song.wav", "audio/x-wav", wavBytes, "1700000000003.wav")
  assert.equal(f.filename, "1700000000003.wav")
  assert.equal(f.mimetype, "audio/wav")
})

test("okänt innehåll: inget byter namn, MIME normaliseras bara", () => {
  const f = runMiddleware("x.wav", "audio/wave", Buffer.from("not really audio at all"), "1700000000004.wav")
  assert.equal(f.filename, "1700000000004.wav")
  assert.equal(f.mimetype, "audio/wav")
  assert.equal(f.detectedFormat, null)
})
