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

const MASTER_DEBUG = process.env.MASTRIFY_MASTER_DEBUG === "1"

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

/** Integrated loudness (LUFS) via EBU R128 — aligns “After” metrics with the real WAV. */
export function measureIntegratedLufsEbur128(filePath) {
  return new Promise((resolve) => {
    if (!ffmpegPath || !fs.existsSync(filePath)) {
      resolve(null)
      return
    }
    const args = [
      "-hide_banner",
      "-nostats",
      "-i",
      filePath,
      "-af",
      "ebur128=framelog=quiet:metadata=0",
      "-f",
      "null",
      "-",
    ]
    const ff = spawn(ffmpegPath, args, { shell: false })
    let stderr = ""
    ff.stderr?.on("data", (d) => {
      stderr += d.toString()
    })
    ff.on("close", () => {
      const m =
        stderr.match(/\bI:\s*([-0-9.]+)\s*LUFS/i) ||
        stderr.match(/Integrated loudness I:\s*([-0-9.]+)/i) ||
        stderr.match(/lavfi\.ebur128\.\d+\.I=\s*([-0-9.]+)/)
      if (m) {
        const v = parseFloat(m[1])
        resolve(Number.isFinite(v) ? v : null)
      } else {
        resolve(null)
      }
    })
    ff.on("error", () => resolve(null))
  })
}

/** Stereo width — `extrastereo` m≈1 is neutral; wider >1, narrower <1. */
function buildStereoStage(stereoEnhance, style) {
  let se = clamp(parseIntSlider(stereoEnhance, 50), 0, 100)
  if (style === "FESTIVAL") se = Math.min(100, se + 10)
  if (style === "WARM") se = Math.max(0, se - 6)
  if (style === "LOUD") se = Math.min(100, se + 4)

  if (se >= 47 && se <= 53) return ""

  if (se > 53) {
    const t = (se - 53) / 47
    const m = 1 + t * 0.26
    return `extrastereo=m=${m.toFixed(4)},`
  }
  const t = (47 - se) / 47
  const m = 1 - t * 0.18
  return `extrastereo=m=${m.toFixed(4)},`
}

function compressorForStyle(style) {
  if (style === "LOUD") {
    return { threshold: -20.2, ratio: 1.95, attack: 22, release: 185 }
  }
  if (style === "CLUB") {
    return { threshold: -20, ratio: 1.88, attack: 24, release: 195 }
  }
  if (style === "WARM") {
    return { threshold: -17.4, ratio: 1.22, attack: 42, release: 320 }
  }
  if (style === "FESTIVAL") {
    return { threshold: -18.1, ratio: 1.62, attack: 28, release: 220 }
  }
  return { threshold: -18, ratio: 1.52, attack: 30, release: 240 }
}

function lraForStyle(style) {
  if (style === "WARM") return 12
  if (style === "LOUD") return 8.5
  if (style === "CLUB") return 8
  if (style === "FESTIVAL") return 9
  return 10
}

/** Per-preset EQ “character” before loudnorm (distinct but still hi-fi). */
function styleCharacterFilters(style) {
  if (style === "WARM") {
    return (
      `equalizer=f=10500:t=q:w=0.9:g=-0.48,` +
      `equalizer=f=7400:t=q:w=1:g=-0.28,`
    )
  }
  if (style === "LOUD") {
    return (
      `equalizer=f=4600:t=q:w=1.05:g=0.72,` +
      `equalizer=f=240:t=q:w=1:g=-0.42,`
    )
  }
  if (style === "CLUB") {
    return (
      `equalizer=f=58:t=q:w=0.78:g=1.12,` +
      `equalizer=f=108:t=q:w=0.82:g=0.62,` +
      `equalizer=f=380:t=q:w=1:g=-0.28,`
    )
  }
  if (style === "FESTIVAL") {
    return `equalizer=f=15200:t=q:w=0.88:g=0.48,`
  }
  return ""
}

function baseTone(style) {
  if (style === "WARM") {
    return {
      lowHz: 70,
      lowGain: 1.28,
      mudGain: -1.22,
      mudWideGain: -0.48,
      airHz: 11800,
      airGain: 0.08,
      dipAboveAirHz: 15500,
      dipAboveAirGain: -0.26,
      highShelf9k: 0.18,
    }
  }
  if (style === "LOUD") {
    return {
      lowHz: 84,
      lowGain: 0.98,
      mudGain: -1.32,
      mudWideGain: -0.52,
      airHz: 13400,
      airGain: 0.22,
      dipAboveAirHz: 15600,
      dipAboveAirGain: -0.48,
      highShelf9k: 0.38,
    }
  }
  if (style === "FESTIVAL") {
    return {
      lowHz: 80,
      lowGain: 1.02,
      mudGain: -1.18,
      mudWideGain: -0.46,
      airHz: 13600,
      airGain: 0.28,
      dipAboveAirHz: 15600,
      dipAboveAirGain: -0.42,
      highShelf9k: 0.42,
    }
  }
  if (style === "CLUB") {
    return {
      lowHz: 76,
      lowGain: 1.32,
      mudGain: -1.08,
      mudWideGain: -0.36,
      airHz: 12600,
      airGain: 0.15,
      dipAboveAirHz: 15400,
      dipAboveAirGain: -0.36,
      highShelf9k: 0.3,
    }
  }
  return {
    lowHz: 78,
    lowGain: 1.04,
    mudGain: -1.14,
    mudWideGain: -0.42,
    airHz: 13000,
    airGain: 0.18,
    dipAboveAirHz: 15500,
    dipAboveAirGain: -0.38,
    highShelf9k: 0.3,
  }
}

/** Sliders — audible but still mastering-safe */
function applyToneSliders(tone, lowEndControl, clarityPresence) {
  const lc = (parseIntSlider(lowEndControl, 50) - 50) / 50
  const cp = (parseIntSlider(clarityPresence, 50) - 50) / 50
  return {
    ...tone,
    lowGain: tone.lowGain + lc * 0.42,
    mudGain: tone.mudGain - lc * 0.12 - cp * 0.12,
    mudWideGain: tone.mudWideGain - cp * 0.08,
    airGain: tone.airGain + cp * 0.32,
    dipAboveAirGain: tone.dipAboveAirGain - Math.max(0, cp) * 0.08,
    highShelf9k: tone.highShelf9k + cp * 0.22,
    presenceDb: cp * 1.35,
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

  /** Cap loudest integrated target (streaming-safe ceiling). */
  const safeIntegratedLufs = Math.min(targetLufs, -9)
  const lra = lraForStyle(style)

  let tone = applyToneSliders(baseTone(style), lowEndControl, clarityPresence)
  const comp = compressorForStyle(style)
  const stereoStage = buildStereoStage(stereoEnhance, style)
  const styleTail = styleCharacterFilters(style)

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
    styleTail +
    `loudnorm=I=${safeIntegratedLufs}:LRA=${lra}:TP=-1:linear=true`

  if (MASTER_DEBUG) {
    console.log("[master] incoming", {
      style,
      targetLufsClient: Number.isFinite(parsedClient) ? parsedClient : null,
      targetLufsResolved: targetLufs,
      loudnormI: safeIntegratedLufs,
      loudnormLRA: lra,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
      reference: Boolean(reference),
    })
    console.log("[master] ffmpeg -af", audioFilter)
  }

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
  const delays = [0, 200, 450, 900]
  for (let attempt = 0; attempt < delays.length && !analysisAfter; attempt++) {
    try {
      if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]))
      analysisAfter = await analyzeTrack(outputPath)
    } catch {
      /* retry */
    }
  }

  if (analysisAfter) {
    const ebu = await measureIntegratedLufsEbur128(outputPath)
    const rmsProxy = analysisAfter.lufs
    if (ebu != null && Number.isFinite(ebu)) {
      analysisAfter = {
        ...analysisAfter,
        lufs: ebu,
        lufsRmsProxy: rmsProxy,
        targetLufsApplied: safeIntegratedLufs,
      }
    } else if (MASTER_DEBUG) {
      console.warn("[master] EBU-128 measure failed; using RMS-proxy lufs in payload")
    }
    if (MASTER_DEBUG) {
      console.log("[master] after metrics", {
        lufs: analysisAfter.lufs,
        targetLufsApplied: analysisAfter.targetLufsApplied ?? safeIntegratedLufs,
        stereoWidth: analysisAfter.stereoWidth,
        bassWeight: analysisAfter.bassWeight,
        brightness: analysisAfter.brightness,
        dynamicRange: analysisAfter.dynamicRange,
      })
    }
  }

  const out = {
    path: outputPath,
    analysisBefore,
    analysisAfter,
  }
  if (MASTER_DEBUG) {
    out.debugInfo = {
      audioFilter,
      loudnormI: safeIntegratedLufs,
      loudnormLRA: lra,
      style,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
    }
  }
  return out
}
