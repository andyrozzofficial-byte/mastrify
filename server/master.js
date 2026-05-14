import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import ffprobePath from "ffprobe-static"
import fs from "fs"
import { spawn } from "child_process"
import { analyzeTrack } from "./analyze.js"

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}
if (ffprobePath?.path) {
  ffmpeg.setFfprobePath(ffprobePath.path)
}

const mastersDir = "/tmp/masters"
if (!fs.existsSync(mastersDir)) {
  fs.mkdirSync(mastersDir, { recursive: true })
}

const VALID_STYLES = new Set(["STREAM", "WARM", "LOUD", "CLUB", "FESTIVAL"])

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

/** 0–100 slider from multipart / JSON */
function parseIntSlider(v, fallback = 50) {
  const n = parseInt(String(v ?? ""), 10)
  if (!Number.isFinite(n)) return fallback
  return clamp(n, 0, 100)
}

function parseStyle(style) {
  const s = String(style || "STREAM").toUpperCase()
  return VALID_STYLES.has(s) ? s : "STREAM"
}

/** Subtle stereo width: `extrastereo` m near 1.0 is transparent; default filter constant is much higher. */
function buildStereoStage(stereoEnhance, style) {
  let se = clamp(parseIntSlider(stereoEnhance, 50), 0, 100)
  if (style === "FESTIVAL") se = Math.min(100, se + 6)
  if (style === "WARM") se = Math.max(0, se - 4)

  if (se >= 49 && se <= 51) return ""

  if (se > 51) {
    const t = (se - 51) / 49
    const m = 1 + t * 0.1
    return `extrastereo=m=${m.toFixed(4)},`
  }
  const t = (49 - se) / 49
  const m = 1 - t * 0.06
  return `extrastereo=m=${m.toFixed(4)},`
}

function compressorForStyle(style) {
  if (style === "LOUD") {
    return { threshold: -19, ratio: 1.68, attack: 26, release: 210 }
  }
  if (style === "CLUB") {
    return { threshold: -19.2, ratio: 1.64, attack: 28, release: 218 }
  }
  if (style === "WARM") {
    return { threshold: -18.2, ratio: 1.38, attack: 36, release: 285 }
  }
  if (style === "FESTIVAL") {
    return { threshold: -18.4, ratio: 1.52, attack: 30, release: 228 }
  }
  return { threshold: -18, ratio: 1.55, attack: 30, release: 240 }
}

function baseTone(style) {
  if (style === "WARM") {
    return {
      lowHz: 72,
      lowGain: 1.12,
      mudGain: -1.15,
      mudWideGain: -0.45,
      airHz: 12500,
      airGain: 0.14,
      dipAboveAirHz: 15500,
      dipAboveAirGain: -0.32,
      highShelf9k: 0.28,
    }
  }
  if (style === "LOUD" || style === "FESTIVAL") {
    return {
      lowHz: 82,
      lowGain: 1.04,
      mudGain: -1.22,
      mudWideGain: -0.48,
      airHz: 13200,
      airGain: style === "FESTIVAL" ? 0.22 : 0.19,
      dipAboveAirHz: 15500,
      dipAboveAirGain: -0.42,
      highShelf9k: 0.34,
    }
  }
  if (style === "CLUB") {
    return {
      lowHz: 80,
      lowGain: 1.1,
      mudGain: -1.18,
      mudWideGain: -0.44,
      airHz: 12800,
      airGain: 0.17,
      dipAboveAirHz: 15500,
      dipAboveAirGain: -0.4,
      highShelf9k: 0.32,
    }
  }
  return {
    lowHz: 78,
    lowGain: 1.06,
    mudGain: -1.12,
    mudWideGain: -0.4,
    airHz: 13000,
    airGain: 0.19,
    dipAboveAirHz: 15500,
    dipAboveAirGain: -0.38,
    highShelf9k: 0.32,
  }
}

/** Slider deltas: subtle, musical */
function applyToneSliders(tone, lowEndControl, clarityPresence) {
  const lc = (parseIntSlider(lowEndControl, 50) - 50) / 50
  const cp = (parseIntSlider(clarityPresence, 50) - 50) / 50
  return {
    ...tone,
    lowGain: tone.lowGain + lc * 0.16,
    mudGain: tone.mudGain - lc * 0.05 - cp * 0.06,
    mudWideGain: tone.mudWideGain - cp * 0.04,
    airGain: tone.airGain + cp * 0.14,
    dipAboveAirGain: tone.dipAboveAirGain - Math.max(0, cp) * 0.05,
    highShelf9k: tone.highShelf9k + cp * 0.08,
    presenceDb: cp * 0.55,
  }
}

/** Wait until the mastered file exists, is non-empty, and size is stable (ffmpeg flush). */
async function waitForMasterOutputReady(filePath) {
  let stable = 0
  let lastSize = -1
  for (let i = 0; i < 120; i++) {
    if (!fs.existsSync(filePath)) {
      await new Promise((r) => setTimeout(r, 25))
      continue
    }
    const sz = fs.statSync(filePath).size
    if (sz <= 0) {
      await new Promise((r) => setTimeout(r, 25))
      continue
    }
    if (sz === lastSize) {
      stable++
      if (stable >= 2) {
        await new Promise((r) => setTimeout(r, 90))
        const sz2 = fs.statSync(filePath).size
        if (sz2 === sz) return sz2
        stable = 0
      }
    } else {
      stable = 0
    }
    lastSize = sz
    await new Promise((r) => setTimeout(r, 20))
  }
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
}

/**
 * @param {object} opts
 * @param {string} opts.file - input wav path
 * @param {string} opts.output - output wav path
 * @param {string} [opts.reference] - optional reference path
 * @param {string} [opts.style] - STREAM | WARM | LOUD | CLUB | FESTIVAL
 * @param {number|string} [opts.targetLufs] - integrated target for loudnorm (when no reference match)
 * @param {string} [opts.mode]
 * @param {number|string} [opts.stereoEnhance] - 0–100
 * @param {number|string} [opts.lowEndControl] - 0–100
 * @param {number|string} [opts.clarityPresence] - 0–100
 */
export async function masterTrack({
  file,
  output,
  reference,
  style: styleIn,
  targetLufs: targetLufsIn,
  mode,
  stereoEnhance: stereoEnhanceIn,
  lowEndControl: lowEndControlIn,
  clarityPresence: clarityPresenceIn,
}) {
  if (!file) throw new Error("File missing")

  const style = parseStyle(styleIn)
  if (!mode) mode = "normal"

  const stereoEnhance = parseIntSlider(stereoEnhanceIn, 50)
  const lowEndControl = parseIntSlider(lowEndControlIn, 50)
  const clarityPresence = parseIntSlider(clarityPresenceIn, 50)

  let referenceAnalysis = null
  if (reference) {
    const refPath = reference
    referenceAnalysis = await analyzeTrack(refPath)
  }

  const styleDefaultLufs = {
    STREAM: -14,
    CLUB: -11,
    LOUD: -10,
    WARM: -13,
    FESTIVAL: -9,
  }

  let parsedClient = parseFloat(String(targetLufsIn ?? "").trim())
  if (!Number.isFinite(parsedClient)) parsedClient = NaN

  let targetLufs
  if (referenceAnalysis?.lufs != null && Number.isFinite(referenceAnalysis.lufs)) {
    targetLufs = referenceAnalysis.lufs
  } else if (Number.isFinite(parsedClient)) {
    targetLufs = clamp(parsedClient, -16, -9)
  } else if (!reference) {
    targetLufs = styleDefaultLufs[style] ?? -14
  } else {
    targetLufs = -14
  }

  targetLufs = parseFloat(targetLufs)
  if (!Number.isFinite(targetLufs)) targetLufs = -14

  const input = file
  const outputPath = output

  if (!outputPath) {
    throw new Error("❌ Output path missing")
  }

  if (!fs.existsSync(input)) {
    throw new Error("Input file not found")
  }

  const probeResult = await new Promise((resolve) => {
    ffmpeg.ffprobe(file, (err, data) => {
      resolve({ err, data })
    })
  })

  if (probeResult?.err) {
    throw new Error(`ffprobe failed: ${probeResult.err.message || probeResult.err}`)
  }

  let stagingDb = 0
  let preAnalysis = null
  try {
    preAnalysis = await analyzeTrack(input)
    const raw = typeof preAnalysis.lufs === "number" ? preAnalysis.lufs : -18
    const stagingTarget = -15
    stagingDb = stagingTarget - raw
    stagingDb = Math.max(-12, Math.min(6, stagingDb))
  } catch {
    /* staging optional */
  }

  const safeIntegratedLufs = Math.min(targetLufs, -9)

  let tone = applyToneSliders(baseTone(style), lowEndControl, clarityPresence)
  const comp = compressorForStyle(style)
  const stereoStage = buildStereoStage(stereoEnhance, style)

  const volumeStaging = stagingDb === 0 ? "" : `volume=${stagingDb.toFixed(2)}dB,`

  const mud = tone.mudGain.toFixed(3)
  const mudW = tone.mudWideGain.toFixed(3)
  const lowG = tone.lowGain.toFixed(3)
  const airG = tone.airGain.toFixed(3)
  const dipG = tone.dipAboveAirGain.toFixed(3)
  const hi9 = tone.highShelf9k.toFixed(3)
  const pr = tone.presenceDb.toFixed(3)

  const audioFilter =
    `highpass=f=25,` +
    volumeStaging +
    stereoStage +
    `equalizer=f=200:t=q:w=1:g=${mud},` +
    `equalizer=f=320:t=q:w=1:g=${mudW},` +
    `equalizer=f=${tone.lowHz}:t=q:w=0.92:g=${lowG},` +
    `equalizer=f=9800:t=q:w=1:g=${hi9},` +
    `equalizer=f=4200:t=q:w=0.92:g=${pr},` +
    `acompressor=threshold=${comp.threshold}dB:ratio=${comp.ratio}:attack=${comp.attack}:release=${comp.release},` +
    `equalizer=f=${tone.airHz}:t=q:w=1.15:g=${airG},` +
    `equalizer=f=${tone.dipAboveAirHz}:t=q:w=1:g=${dipG},` +
    `loudnorm=I=${safeIntegratedLufs}:LRA=10:TP=-1:linear=true`

  await new Promise((resolve, reject) => {
    let settled = false
    let cmdRef = null

    const timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        cmdRef?.kill("SIGKILL")
      } catch {
        /* ignore */
      }
      reject(new Error("Mastering timed out"))
    }, 60_000)

    try {
      fs.chmodSync(ffmpegPath, 0o755)
    } catch {
      /* ignore */
    }

    const args = [
      "-y",
      "-i",
      file,
      "-vn",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      "-f",
      "wav",
      "-af",
      audioFilter,
      outputPath,
    ]

    const ff = spawn(ffmpegPath, args, { shell: false })
    cmdRef = ff

    ff.on("close", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)

      if (code === 0) {
        resolve()
      } else {
        reject(new Error("ffmpeg failed"))
      }
    })

    ff.on("error", (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      console.error("[master] ffmpeg spawn error:", err?.message || err)
      reject(err)
    })
  })

  await waitForMasterOutputReady(outputPath)

  let analysisBefore = preAnalysis
  if (!analysisBefore) {
    try {
      analysisBefore = await analyzeTrack(input)
    } catch {
      analysisBefore = null
    }
  }

  let analysisAfter = null
  const delays = [0, 200, 450]
  for (let attempt = 0; attempt < delays.length && !analysisAfter; attempt++) {
    try {
      if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]))
      analysisAfter = await analyzeTrack(outputPath)
    } catch {
      /* retry */
    }
  }

  return {
    path: outputPath,
    analysisBefore,
    analysisAfter,
  }
}
