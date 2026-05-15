import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import ffprobePath from "ffprobe-static"
import fs from "fs"
import { spawn } from "child_process"
import { analyzeTrack } from "./analyze.js"
import {
  buildMasteringInsights,
  attachMasteringInsightsToAnalysis,
} from "./masterInsightsPayload.js"
import {
  MASTRIFY_LUFS_TRACE as LUFS_TRACE,
  MASTRIFY_MASTER_DEBUG as MASTER_DEBUG,
  MASTRIFY_PIPELINE_DEBUG as PIPELINE_DEBUG,
} from "./mastrifyDebug.js"

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

/** Bump when tracing deploy skew — echoed in logs + JSON when MASTRIFY_LUFS_TRACE=1 */
const LUFS_TRACE_BUILD_STAMP = "mastrify-master-20260515-transient-first"

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

function parseEbur128Integrated(stderr) {
  if (!stderr || typeof stderr !== "string") return null
  const patterns = [
    /\bI:\s*([-0-9.]+)\s*LUFS/i,
    /Integrated loudness:\s*\r?\n\s*I:\s*([-0-9.]+)\s*LUFS/im,
    /Integrated loudness I:\s*([-0-9.]+)/i,
    /lavfi\.ebur128\.\d+\.I=\s*([-0-9.]+)/,
  ]
  for (const re of patterns) {
    const m = stderr.match(re)
    if (m) {
      const v = parseFloat(m[1])
      if (Number.isFinite(v)) return v
    }
  }
  return null
}

/**
 * Integrated loudness (LUFS) via EBU R128 — aligns “After” metrics with the real WAV.
 * Waits for process exit so stderr contains the final Summary block.
 */
export async function measureIntegratedLufsEbur128(filePath) {
  if (!ffmpegPath || !fs.existsSync(filePath)) return null
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
  try {
    await new Promise((resolve, reject) => {
      ff.once("error", reject)
      ff.once("close", resolve)
    })
  } catch {
    return null
  }
  const v = parseEbur128Integrated(stderr)
  if (v == null && (MASTER_DEBUG || PIPELINE_DEBUG)) {
    const tail = stderr.slice(-1400).replace(/\r/g, "\n")
    console.warn("[master] EBU parse miss; stderr tail:\n", tail)
  }
  return v
}

/** Hot integrated targets (club/CD) where adaptive protection applies. */
function isHotLoudnessTarget(requestedLufs) {
  return typeof requestedLufs === "number" && Number.isFinite(requestedLufs) && requestedLufs >= -10
}

/** Stereo width — `extrastereo` m≈1 is neutral; wider >1, narrower <1. */
function buildStereoStage(stereoEnhance, style, hotClubProtection = false) {
  let se = clamp(parseIntSlider(stereoEnhance, 50), 0, 100)
  if (style === "FESTIVAL" && !hotClubProtection) se = Math.min(100, se + 10)
  if (style === "WARM") se = Math.max(0, se - 6)
  if (style === "LOUD" && !hotClubProtection) se = Math.min(100, se + 4)
  if (hotClubProtection) se = Math.max(0, se - 14)

  if (se >= 47 && se <= 53) return ""

  if (se > 53) {
    const t = (se - 53) / 47
    const widen = hotClubProtection ? 0.14 : 0.26
    const m = 1 + t * widen
    return `extrastereo=m=${m.toFixed(4)},`
  }
  const t = (47 - se) / 47
  const m = 1 - t * 0.18
  return `extrastereo=m=${m.toFixed(4)},`
}

function compressorForStyle(style) {
  if (style === "LOUD") {
    return { threshold: -19.5, ratio: 1.42, attack: 32, release: 260 }
  }
  if (style === "CLUB") {
    return { threshold: -19.8, ratio: 1.38, attack: 34, release: 280 }
  }
  if (style === "WARM") {
    return { threshold: -16.8, ratio: 1.14, attack: 48, release: 360 }
  }
  if (style === "FESTIVAL") {
    return { threshold: -18.8, ratio: 1.32, attack: 36, release: 290 }
  }
  return { threshold: -19.2, ratio: 1.28, attack: 38, release: 300 }
}

/** Scale bus compression — 1 = full, lower = gentler (transient safety). */
function scaleCompressorIntensity(comp, intensity) {
  const i = clamp(intensity, 0.35, 1)
  if (i >= 0.98) return comp
  const ratio = 1 + (comp.ratio - 1) * i
  return {
    threshold: comp.threshold + (1 - i) * 3.2,
    ratio: Math.max(1.05, Number(ratio.toFixed(2))),
    attack: Math.round(comp.attack + (1 - i) * 14),
    release: Math.min(420, Math.round(comp.release + (1 - i) * 40)),
  }
}

/** Gentler bus compression — loudnorm does level work, not stacked gain. */
function compressorForStyleAndTarget(style, integratedTarget, compIntensity = 1) {
  const base = compressorForStyle(style)
  const t = typeof integratedTarget === "number" && Number.isFinite(integratedTarget) ? integratedTarget : -14
  let comp = base
  if ((style === "CLUB" || style === "FESTIVAL") && t >= -10.5) {
    comp = { threshold: -17.8, ratio: 1.12, attack: 44, release: 340 }
  } else if (style === "LOUD" && t >= -10.5) {
    comp = { threshold: -18.2, ratio: 1.18, attack: 40, release: 310 }
  } else if (t >= -10.5) {
    comp = {
      threshold: base.threshold + 3.5,
      ratio: Math.max(1.08, base.ratio - 0.28),
      attack: base.attack + 12,
      release: Math.min(400, base.release + 70),
    }
  } else if (t >= -12.5) {
    comp = {
      threshold: base.threshold + 2,
      ratio: Math.max(1.1, base.ratio - 0.15),
      attack: base.attack + 6,
      release: Math.min(360, base.release + 45),
    }
  }
  return scaleCompressorIntensity(comp, compIntensity)
}

/** True-peak ceiling — more headroom when we back off hot targets (punch > exact LUFS). */
function truePeakForLoudnormTarget(integratedTarget, requestedTarget) {
  const t = typeof integratedTarget === "number" && Number.isFinite(integratedTarget) ? integratedTarget : -14
  const req =
    typeof requestedTarget === "number" && Number.isFinite(requestedTarget) ? requestedTarget : t
  if (req >= -10 && t < req - 0.3) return -1.05
  if (t >= -9.5) return -0.85
  if (t >= -10.5) return -1
  if (t >= -11.5) return -1.25
  if (t >= -13.5) return -1.5
  return -2
}

function lraForStyle(style) {
  if (style === "WARM") return 12
  if (style === "LOUD") return 8.5
  if (style === "CLUB") return 8
  if (style === "FESTIVAL") return 9
  return 10
}

function lraForStyleAndTarget(style, integratedTarget, requestedTarget) {
  const base = lraForStyle(style)
  const t = typeof integratedTarget === "number" && Number.isFinite(integratedTarget) ? integratedTarget : -14
  const req =
    typeof requestedTarget === "number" && Number.isFinite(requestedTarget) ? requestedTarget : t
  if (isHotLoudnessTarget(req) && (style === "CLUB" || style === "FESTIVAL" || style === "LOUD")) {
    return Math.max(base, 11)
  }
  if (t <= -12) return Math.max(base, 11)
  if (req - t > 0.35) return Math.min(base + 1.5, 12)
  return base
}

function headroomContextFromAnalysis(preAnalysis, ebuInputIntegrated, pass1Json = null) {
  const num = (v) => {
    const n = parseFloat(String(v ?? "").replace(/"/g, "").trim())
    return Number.isFinite(n) ? n : null
  }
  return {
    integratedLufs:
      ebuInputIntegrated != null && Number.isFinite(ebuInputIntegrated)
        ? ebuInputIntegrated
        : typeof preAnalysis?.lufs === "number"
          ? preAnalysis.lufs
          : null,
    dynamicRange: typeof preAnalysis?.dynamicRange === "number" ? preAnalysis.dynamicRange : null,
    peakDb: typeof preAnalysis?.peakDb === "number" ? preAnalysis.peakDb : null,
    bassWeight: typeof preAnalysis?.bassWeight === "number" ? preAnalysis.bassWeight : null,
    pass1InputTp: pass1Json ? num(pass1Json.input_tp) : null,
    pass1InputLra: pass1Json ? num(pass1Json.input_lra) : null,
    pass1OutputLra: pass1Json ? num(pass1Json.output_lra) : null,
  }
}

/**
 * Back off hot targets when the mix cannot safely reach requested LUFS.
 * Quieter resolved target (e.g. -10 vs -9) preserves punch and reduces limiting.
 */
function resolveSafeIntegratedLufs(requestedLufs, ctx) {
  const requested = clamp(requestedLufs, -16, -9)
  const reasons = []
  let backoff = 0

  const drEarly = ctx.dynamicRange
  if (drEarly != null && drEarly < 7) {
    backoff += 0.35
    reasons.push(`collapsedDR=${drEarly.toFixed(1)}dB`)
  }
  if (drEarly != null && drEarly < 5.5) {
    backoff += 0.25
    reasons.push(`veryLowDR=${drEarly.toFixed(1)}dB`)
  }

  if (!isHotLoudnessTarget(requested)) {
    const integrated = ctx.integratedLufs
    if (integrated != null && requested - integrated > 5.5) {
      backoff += 0.2
      reasons.push(`streamingLargeGap=${(requested - integrated).toFixed(1)}LU`)
    }
    backoff = Math.min(backoff, 0.75)
    const resolved = Math.max(requested - backoff, -16)
    return {
      requested,
      resolved,
      backoffLu: Number(backoff.toFixed(2)),
      limiterReductionEstimateDb: Number(backoff.toFixed(2)),
      transientProtection: { active: backoff > 0.05, reasons, preserveTransients: true },
    }
  }
  const dr = ctx.dynamicRange
  if (dr != null && dr > 9) {
    backoff += 0.25
    reasons.push(`dynamicRange=${dr.toFixed(1)}dB`)
  }
  if (dr != null && dr > 12.5) {
    backoff += 0.35
    reasons.push(`highDR=${dr.toFixed(1)}dB`)
  }

  const peak = ctx.peakDb
  if (peak != null && peak > -2.5) {
    backoff += 0.35
    reasons.push(`hotPeak=${peak.toFixed(1)}dBFS`)
  }
  if (peak != null && peak > -1.2) {
    backoff += 0.25
    reasons.push(`nearClipPeak=${peak.toFixed(1)}dBFS`)
  }

  const bass = ctx.bassWeight
  if (bass != null && bass > 0.4) {
    backoff += 0.3
    reasons.push(`bassWeight=${(bass * 100).toFixed(0)}%`)
  }
  if (bass != null && bass > 0.52) {
    backoff += 0.25
    reasons.push(`heavyLowEnd=${(bass * 100).toFixed(0)}%`)
  }

  const integrated = ctx.integratedLufs
  if (integrated != null && requested - integrated > 7) {
    backoff += 0.35
    reasons.push(`largeLufsGap=${(requested - integrated).toFixed(1)}LU`)
  }

  const inputTp = ctx.pass1InputTp
  if (inputTp != null && inputTp > -2) {
    backoff += 0.35
    reasons.push(`pass1InputTp=${inputTp.toFixed(1)}dBTP`)
  }

  const inputLra = ctx.pass1InputLra
  if (inputLra != null && inputLra > 11) {
    backoff += 0.25
    reasons.push(`pass1LRA=${inputLra.toFixed(1)}LU`)
  }

  const maxBackoff = 1.5
  backoff = Math.min(backoff, maxBackoff)
  let resolved = requested - backoff
  resolved = Math.max(resolved, -10.5)
  resolved = Math.min(resolved, requested)

  const limiterReductionEstimateDb = Number((requested - resolved).toFixed(2))

  return {
    requested,
    resolved,
    backoffLu: Number(backoff.toFixed(2)),
    limiterReductionEstimateDb,
    transientProtection: {
      active: backoff > 0.05,
      reasons,
      preserveTransients: true,
    },
  }
}

/**
 * Minimal pregain — loudnorm handles level; avoid stacking gain before it.
 * Streaming: max ~+3 dB. Club: max ~+1.25 dB.
 */
function computeAdaptivePregain(resolvedLufs, ctx, pregainScale = 1) {
  const integrated = ctx.integratedLufs
  if (integrated == null || !Number.isFinite(integrated)) {
    return { pregainDb: 0, factors: {}, maxGainCap: 0 }
  }

  const gap = resolvedLufs - integrated
  if (gap <= 1.15) return { pregainDb: 0, factors: { gap, note: "nearTarget" }, maxGainCap: 0 }

  const hot = isHotLoudnessTarget(resolvedLufs)
  const maxGain = hot ? 1.25 : 3
  let factor = hot ? 0.1 : 0.2
  const factors = { gap, hot, baseFactor: factor, maxGainCap: maxGain }

  const dr = ctx.dynamicRange
  if (dr != null && dr > 9) {
    factor *= 0.55
    factors.drScale = 0.55
  }
  if (dr != null && dr > 11.5) {
    factor *= 0.45
    factors.drScaleHigh = 0.45
  }
  if (dr != null && dr < 8) {
    factor *= 0.65
    factors.lowDrScale = 0.65
  }

  const bass = ctx.bassWeight
  if (bass != null && bass > 0.4) {
    factor *= 0.7
    factors.bassScale = 0.7
  }

  if (ctx.peakDb != null && ctx.peakDb > -2.5) {
    factor *= 0.6
    factors.peakScale = 0.6
  }

  if (gap > 6) {
    factor *= 0.5
    factors.largeGapScale = 0.5
  }

  let pregainDb = gap * factor
  pregainDb = Math.min(pregainDb, maxGain)
  pregainDb *= clamp(pregainScale, 0, 1)
  pregainDb = Math.max(0, pregainDb)

  return { pregainDb: Number(pregainDb.toFixed(2)), factors, maxGainCap: maxGain }
}

function parseLoudnormJsonNum(j, key) {
  if (!j || j[key] == null) return null
  const n = parseFloat(String(j[key]).replace(/"/g, "").trim())
  return Number.isFinite(n) ? n : null
}

/** Crest proxy from peak vs integrated (higher = more transient headroom). */
function estimateCrestDb(ctx) {
  const peak = ctx.peakDb
  const lufs = ctx.integratedLufs
  if (peak != null && lufs != null) return peak - lufs
  return ctx.dynamicRange
}

/**
 * Transient safety — reduce pregain, compression, and target when dynamics collapse
 * or loudnorm would be over-driven.
 */
function assessTransientSafety({
  requestedLufs,
  resolvedLufs,
  ctx,
  pregainDb,
  pass1Json = null,
}) {
  const triggers = []
  let pregainScale = 1
  let compIntensity = 1
  let targetBackoffLu = 0
  let loudnormOverDriven = false
  let estimatedGainReductionDb = 0

  const crest = estimateCrestDb(ctx)
  const dr = ctx.dynamicRange

  if (crest != null && crest < 8) {
    triggers.push(`lowCrest=${crest.toFixed(1)}dB`)
    pregainScale *= 0.45
    compIntensity *= 0.82
    targetBackoffLu += 0.35
  }
  if (dr != null && dr < 7) {
    triggers.push(`lowDR=${dr.toFixed(1)}dB`)
    pregainScale *= 0.4
    compIntensity *= 0.78
    targetBackoffLu += 0.4
  }
  if (dr != null && dr < 5.5) {
    triggers.push(`collapsedDR=${dr.toFixed(1)}dB`)
    pregainScale *= 0.55
    targetBackoffLu += 0.35
  }

  if (pregainDb > 2.8 && !isHotLoudnessTarget(resolvedLufs)) {
    triggers.push(`pregainHighStreaming=${pregainDb.toFixed(1)}dB`)
    pregainScale *= 0.55
    loudnormOverDriven = true
  }
  if (pregainDb > 1.1 && isHotLoudnessTarget(resolvedLufs)) {
    triggers.push(`pregainHighClub=${pregainDb.toFixed(1)}dB`)
    pregainScale *= 0.35
    loudnormOverDriven = true
  }

  if (pass1Json) {
    const inputLra = parseLoudnormJsonNum(pass1Json, "input_lra")
    const outputLra = parseLoudnormJsonNum(pass1Json, "output_lra")
    const inputTp = parseLoudnormJsonNum(pass1Json, "input_tp")
    const offset = parseLoudnormJsonNum(pass1Json, "offset")
    const inputI = parseLoudnormJsonNum(pass1Json, "input_i")
    const outputI = parseLoudnormJsonNum(pass1Json, "output_i")

    if (inputLra != null && outputLra != null && outputLra < inputLra - 3) {
      triggers.push(`pass1LraCollapse=${(inputLra - outputLra).toFixed(1)}LU`)
      pregainScale *= 0.35
      compIntensity *= 0.75
      targetBackoffLu += 0.45
      loudnormOverDriven = true
      estimatedGainReductionDb = Math.max(estimatedGainReductionDb, inputLra - outputLra)
    }
    if (inputTp != null && inputTp > -0.8) {
      triggers.push(`pass1HotTp=${inputTp.toFixed(1)}dBTP`)
      pregainScale *= 0.5
      targetBackoffLu += 0.3
      loudnormOverDriven = true
    }
    if (offset != null && Math.abs(offset) > 4.5) {
      triggers.push(`pass1LoudnormOffset=${offset.toFixed(1)}dB`)
      pregainScale *= 0.4
      compIntensity *= 0.85
      loudnormOverDriven = true
      estimatedGainReductionDb = Math.max(estimatedGainReductionDb, Math.abs(offset))
    }
    if (inputI != null && outputI != null && outputI - inputI > 2.2) {
      triggers.push(`pass1HeavyLift=${(outputI - inputI).toFixed(1)}LU`)
      pregainScale *= 0.45
      loudnormOverDriven = true
    }
  }

  targetBackoffLu = Math.min(targetBackoffLu, 1.25)
  pregainScale = Math.max(0, Math.min(1, pregainScale))
  compIntensity = Math.max(0.35, Math.min(1, compIntensity))

  const active = triggers.length > 0
  let adjustedResolved = resolvedLufs
  if (targetBackoffLu > 0.05) {
    adjustedResolved = Math.max(resolvedLufs - targetBackoffLu, isHotLoudnessTarget(requestedLufs) ? -11 : -16)
    adjustedResolved = Math.min(adjustedResolved, resolvedLufs)
  }

  return {
    active,
    triggers,
    pregainScale,
    compIntensity,
    targetBackoffLu: Number(targetBackoffLu.toFixed(2)),
    adjustedResolved: Number(adjustedResolved.toFixed(2)),
    loudnormOverDriven,
    estimatedGainReductionDb: Number(estimatedGainReductionDb.toFixed(2)),
    crestDb: crest != null ? Number(crest.toFixed(2)) : null,
  }
}

/** Light low-end balance only — no clipper (avoids stacked limiting before loudnorm). */
function clubProtectionFilters(style, requestedLufs) {
  if (!isHotLoudnessTarget(requestedLufs)) return ""
  if (style !== "CLUB" && style !== "FESTIVAL" && !(style === "LOUD" && requestedLufs >= -10.5)) {
    return ""
  }
  return `equalizer=f=52:t=q:w=0.85:g=-0.28,` + `equalizer=f=120:t=q:w=0.92:g=-0.15,`
}

function logAdaptiveLoudness(payload) {
  if (MASTER_DEBUG || PIPELINE_DEBUG || LUFS_TRACE) {
    console.log("[master] adaptive loudness", payload)
  }
}

function logTransientSafety(payload) {
  if (MASTER_DEBUG || PIPELINE_DEBUG || LUFS_TRACE) {
    console.log("[master] transient safety", payload)
  }
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
      `equalizer=f=4600:t=q:w=1.05:g=0.42,` +
      `equalizer=f=240:t=q:w=1:g=-0.28,`
    )
  }
  if (style === "CLUB") {
    return (
      `equalizer=f=58:t=q:w=0.78:g=0.48,` +
      `equalizer=f=108:t=q:w=0.82:g=0.28,` +
      `equalizer=f=380:t=q:w=1:g=-0.18,`
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

/** Parse loudnorm `print_format=json` object from ffmpeg stderr. */
function extractLoudnormJsonFromStderr(stderr) {
  if (!stderr || typeof stderr !== "string") return null
  const marker = '"input_i"'
  const pos = stderr.indexOf(marker)
  if (pos < 0) return null
  let start = pos
  while (start >= 0 && stderr[start] !== "{") start--
  if (stderr[start] !== "{") return null
  let depth = 0
  for (let i = start; i < stderr.length; i++) {
    const c = stderr[i]
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(stderr.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function loudnormMeasuredToOpts(j) {
  if (!j || j.input_i == null) return null
  const qn = (v) => {
    const n = parseFloat(String(v).replace(/"/g, "").trim())
    return Number.isFinite(n) ? n.toFixed(4) : "0.0000"
  }
  return {
    measured_I: qn(j.input_i),
    measured_LRA: qn(j.input_lra),
    measured_TP: qn(j.input_tp),
    measured_thresh: qn(j.input_thresh),
    offset: qn(j.target_offset),
  }
}

async function runFfmpegCapture(args, label) {
  try {
    fs.chmodSync(ffmpegPath, 0o755)
  } catch {
    /* ignore */
  }
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, args, { shell: false })
    let stderr = ""
    ff.stderr?.on("data", (d) => {
      stderr += d.toString()
    })
    const timeoutId = setTimeout(() => {
      try {
        ff.kill("SIGKILL")
      } catch {
        /* ignore */
      }
      reject(new Error(`${label} timed out`))
    }, 120_000)
    ff.once("error", (err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
    ff.once("close", (code) => {
      clearTimeout(timeoutId)
      resolve({ code: code ?? -1, stderr })
    })
  })
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
    WARM: -13,
    LOUD: -11,
    CLUB: -9,
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

  const requestedLufs = Math.min(targetLufs, -9)

  if (LUFS_TRACE) {
    console.log("[LUFS_TRACE] masterTrack target resolution", {
      stamp: LUFS_TRACE_BUILD_STAMP,
      incomingTargetLufsRaw: targetLufsIn,
      parsedClient,
      referenceBranch: Boolean(reference && referenceAnalysis?.lufs != null),
      targetLufsResolved: targetLufs,
      requestedLufs,
    })
  }

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

  let preAnalysis = null
  try {
    preAnalysis = await analyzeTrack(input)
  } catch {
    /* optional */
  }

  const ebuInputIntegrated = await measureIntegratedLufsEbur128(input)

  const headroomCtxInitial = headroomContextFromAnalysis(preAnalysis, ebuInputIntegrated)
  let adaptiveLoudness = resolveSafeIntegratedLufs(requestedLufs, headroomCtxInitial)
  let safeIntegratedLufs = adaptiveLoudness.resolved

  let stagingDb = 0
  let adaptiveGain = computeAdaptivePregain(safeIntegratedLufs, headroomCtxInitial, 1)
  let autoPreGainDb = adaptiveGain.pregainDb
  let compIntensity = 1

  let transientSafety = assessTransientSafety({
    requestedLufs,
    resolvedLufs: safeIntegratedLufs,
    ctx: headroomCtxInitial,
    pregainDb: autoPreGainDb,
  })
  if (transientSafety.active) {
    safeIntegratedLufs = transientSafety.adjustedResolved
    adaptiveGain = computeAdaptivePregain(
      safeIntegratedLufs,
      headroomCtxInitial,
      transientSafety.pregainScale
    )
    autoPreGainDb = adaptiveGain.pregainDb
    compIntensity = transientSafety.compIntensity
  }

  if (ebuInputIntegrated == null && preAnalysis) {
    try {
      const raw = typeof preAnalysis.lufs === "number" ? preAnalysis.lufs : -18
      const stagingTarget = -15
      stagingDb = stagingTarget - raw
      stagingDb = Math.max(-10, Math.min(3, stagingDb))
    } catch {
      /* ignore */
    }
  }

  const hotClubProtection =
    isHotLoudnessTarget(requestedLufs) &&
    (style === "CLUB" || style === "FESTIVAL" || (style === "LOUD" && requestedLufs >= -10.5))

  logTransientSafety({
    phase: "pre-pass1",
    ...transientSafety,
    pregainBeforeLoudnormDb: autoPreGainDb,
    compressionIntensity: compIntensity,
  })

  logAdaptiveLoudness({
    phase: "pre-pass1",
    style,
    requestedLufs,
    safeIntegratedLufs,
    backoffLu: adaptiveLoudness.backoffLu,
    limiterReductionEstimateDb: adaptiveLoudness.limiterReductionEstimateDb,
    pregainAppliedDb: autoPreGainDb,
    pregainFactors: adaptiveGain.factors,
    transientProtection: adaptiveLoudness.transientProtection,
    hotClubProtection,
    ebuInputIntegrated,
    headroom: headroomCtxInitial,
    compressionIntensity: compIntensity,
    philosophy: "transient-first-minimal-pregain",
  })

  function buildColorPipeline(integratedLufs, pregainDb, compInt = compIntensity) {
    const lraVal = lraForStyleAndTarget(style, integratedLufs, requestedLufs)
    const compVal = compressorForStyleAndTarget(style, integratedLufs, compInt)
    const tpVal = truePeakForLoudnormTarget(integratedLufs, requestedLufs)
    const tone = applyToneSliders(baseTone(style), lowEndControl, clarityPresence)
    const stereoStage = buildStereoStage(stereoEnhance, style, hotClubProtection)
    const styleTail = styleCharacterFilters(style)
    const clubProt = clubProtectionFilters(style, requestedLufs)
    const volumeStaging = stagingDb === 0 ? "" : `volume=${stagingDb.toFixed(2)}dB,`
    const autoPreVol = pregainDb > 0 ? `volume=${pregainDb.toFixed(2)}dB,` : ""

    const mud = tone.mudGain.toFixed(3)
    const mudW = tone.mudWideGain.toFixed(3)
    const lowG = tone.lowGain.toFixed(3)
    const airG = tone.airGain.toFixed(3)
    const dipG = tone.dipAboveAirGain.toFixed(3)
    const hi9 = tone.highShelf9k.toFixed(3)
    const pr = tone.presenceDb.toFixed(3)

    const colorBase =
      `highpass=f=25,` +
      volumeStaging +
      stereoStage +
      `equalizer=f=200:t=q:w=1:g=${mud},` +
      `equalizer=f=320:t=q:w=1:g=${mudW},` +
      `equalizer=f=${tone.lowHz}:t=q:w=0.92:g=${lowG},` +
      `equalizer=f=9800:t=q:w=1:g=${hi9},` +
      `equalizer=f=4200:t=q:w=0.92:g=${pr},` +
      `acompressor=threshold=${compVal.threshold}dB:ratio=${compVal.ratio}:attack=${compVal.attack}:release=${compVal.release},` +
      `equalizer=f=${tone.airHz}:t=q:w=1.15:g=${airG},` +
      `equalizer=f=${tone.dipAboveAirHz}:t=q:w=1:g=${dipG},` +
      styleTail +
      clubProt +
      autoPreVol

    return {
      colorBase,
      loudnormStem: `I=${integratedLufs}:LRA=${lraVal}:TP=${tpVal}`,
      lra: lraVal,
      tp: tpVal,
      comp: compVal,
    }
  }

  async function runLoudnormPasses(integratedLufs, pregainDb, compInt = compIntensity) {
    const pipe = buildColorPipeline(integratedLufs, pregainDb, compInt)
    const stem = pipe.loudnormStem
    let pass1Json = null
    let filterFinal = ""
    let twoPass = false
    let exitCode = null

    const pass1Af = `${pipe.colorBase}loudnorm=${stem}:linear=true:print_format=json`
    const pass1Args = [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-vn",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-af",
      pass1Af,
      "-f",
      "null",
      "-",
    ]

    try {
      const r1 = await runFfmpegCapture(pass1Args, "loudnorm-pass1")
      exitCode = r1.code
      if (r1.code === 0) {
        pass1Json = extractLoudnormJsonFromStderr(r1.stderr)
      }
      const measured = loudnormMeasuredToOpts(pass1Json)
      if (measured) {
        filterFinal =
          `${pipe.colorBase}loudnorm=${stem}:measured_I=${measured.measured_I}:measured_LRA=${measured.measured_LRA}:measured_TP=${measured.measured_TP}:measured_thresh=${measured.measured_thresh}:offset=${measured.offset}:linear=true`
        twoPass = true
      }
    } catch (e) {
      if (MASTER_DEBUG || PIPELINE_DEBUG || LUFS_TRACE) {
        console.warn("[master] loudnorm pass1 error:", e?.message || e)
      }
    }

    if (!filterFinal) {
      filterFinal = `${pipe.colorBase}loudnorm=${stem}:linear=true`
      twoPass = false
    }

    return {
      audioFilterFinal: filterFinal,
      loudnormPass1Json: pass1Json,
      usedTwoPass: twoPass,
      pass1ExitCode: exitCode,
      lra: pipe.lra,
      tp: pipe.tp,
    }
  }

  let {
    audioFilterFinal,
    loudnormPass1Json,
    usedTwoPass,
    pass1ExitCode,
    lra,
    tp,
  } = await runLoudnormPasses(safeIntegratedLufs, autoPreGainDb)

  if (loudnormPass1Json) {
    const ctxPass1 = headroomContextFromAnalysis(preAnalysis, ebuInputIntegrated, loudnormPass1Json)
    const pass1Safety = assessTransientSafety({
      requestedLufs,
      resolvedLufs: safeIntegratedLufs,
      ctx: ctxPass1,
      pregainDb: autoPreGainDb,
      pass1Json: loudnormPass1Json,
    })
    const refinedAdaptive = resolveSafeIntegratedLufs(requestedLufs, ctxPass1)
    const targetDrop =
      refinedAdaptive.resolved < safeIntegratedLufs - 0.2 ||
      pass1Safety.adjustedResolved < safeIntegratedLufs - 0.15
    const needsRerun = pass1Safety.active || targetDrop

    if (needsRerun) {
      if (refinedAdaptive.resolved < safeIntegratedLufs) {
        safeIntegratedLufs = refinedAdaptive.resolved
        adaptiveLoudness = refinedAdaptive
      }
      if (pass1Safety.adjustedResolved < safeIntegratedLufs) {
        safeIntegratedLufs = pass1Safety.adjustedResolved
      }
      transientSafety = pass1Safety
      compIntensity = pass1Safety.compIntensity
      adaptiveGain = computeAdaptivePregain(
        safeIntegratedLufs,
        ctxPass1,
        pass1Safety.pregainScale
      )
      autoPreGainDb = adaptiveGain.pregainDb

      logTransientSafety({
        phase: "pass1-refine",
        ...pass1Safety,
        pregainBeforeLoudnormDb: autoPreGainDb,
        compressionIntensity: compIntensity,
        loudnormOverDriven: pass1Safety.loudnormOverDriven,
      })
      logAdaptiveLoudness({
        phase: "pass1-refine",
        style,
        requestedLufs,
        safeIntegratedLufs,
        backoffLu: adaptiveLoudness.backoffLu,
        pregainAppliedDb: autoPreGainDb,
        pregainFactors: adaptiveGain.factors,
        compressionIntensity: compIntensity,
        pass1_input_tp: loudnormPass1Json.input_tp,
        pass1_input_lra: loudnormPass1Json.input_lra,
        pass1_offset: loudnormPass1Json.offset,
      })
      ;({
        audioFilterFinal,
        loudnormPass1Json,
        usedTwoPass,
        pass1ExitCode,
        lra,
        tp,
      } = await runLoudnormPasses(safeIntegratedLufs, autoPreGainDb, compIntensity))
    }
  }

  if (LUFS_TRACE) {
    console.log("[LUFS_TRACE] loudnorm path", {
      stamp: LUFS_TRACE_BUILD_STAMP,
      pass1ExitCode,
      usedTwoPass,
      pass1HasInputI: Boolean(loudnormPass1Json?.input_i),
      pass1OutputI: loudnormPass1Json?.output_i ?? null,
      fallbackOnePassOnly: !usedTwoPass,
      requestedLufs,
      safeIntegratedLufs,
    })
  }

  if (MASTER_DEBUG || PIPELINE_DEBUG || LUFS_TRACE) {
    console.log("[master] loudnorm plan", {
      style,
      targetLufsClient: Number.isFinite(parsedClient) ? parsedClient : null,
      targetLufsResolved: targetLufs,
      requestedLufs,
      loudnormI: safeIntegratedLufs,
      loudnormLRA: lra,
      loudnormTP: tp,
      loudnormTwoPass: usedTwoPass,
      ebuInputIntegrated,
      gainStagingDb: stagingDb,
      autoPreGainBeforeLoudnormDb: autoPreGainDb,
      compressionIntensity: compIntensity,
      transientSafetyTriggers: transientSafety?.triggers ?? [],
      loudnormOverDriven: transientSafety?.loudnormOverDriven ?? false,
      estimatedGainReductionDb: transientSafety?.estimatedGainReductionDb ?? null,
      adaptiveBackoffLu: adaptiveLoudness.backoffLu,
      limiterReductionEstimateDb: adaptiveLoudness.limiterReductionEstimateDb,
      pass1_input_i: loudnormPass1Json?.input_i,
      pass1_output_i: loudnormPass1Json?.output_i,
      pass1_input_tp: loudnormPass1Json?.input_tp,
    })
    console.log("[master] ffmpeg -af", audioFilterFinal)
  }

  const encodeArgs = [
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
    audioFilterFinal,
    outputPath,
  ]

  const enc = await runFfmpegCapture(encodeArgs, "master-encode")
  if (enc.code !== 0) {
    throw new Error("ffmpeg master encode failed")
  }

  await waitForMasterOutputReady(outputPath)

  /** Single post-render EBU measurement — authoritative integrated loudness of the WAV on disk. */
  const authorityEbuIntegrated = await measureIntegratedLufsEbur128(outputPath)
  if (LUFS_TRACE) {
    console.log("[LUFS_TRACE] AUTHORITY_EBU_AFTER_ENCODE_FILE", {
      stamp: LUFS_TRACE_BUILD_STAMP,
      outputPath,
      authorityEbuIntegrated,
      loudnormTargetI: safeIntegratedLufs,
      deltaFromTargetLu:
        authorityEbuIntegrated != null && Number.isFinite(authorityEbuIntegrated)
          ? Number((authorityEbuIntegrated - safeIntegratedLufs).toFixed(2))
          : null,
      usedTwoPass,
    })
  }

  if (MASTER_DEBUG || PIPELINE_DEBUG) {
    console.log("[master] loudness after render", {
      targetLufsIntegrated: safeIntegratedLufs,
      measuredEbuIntegrated: authorityEbuIntegrated,
      loudnormTwoPass: usedTwoPass,
      truePeakCeiling_TP: tp,
      pass1_predicted_output_i: loudnormPass1Json?.output_i,
      pass1_input_tp: loudnormPass1Json?.input_tp,
      gainStagingDb: stagingDb,
      autoPreGainBeforeLoudnormDb: autoPreGainDb,
    })
  }

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
    let ebu = await measureIntegratedLufsEbur128(outputPath)
    if (ebu == null) {
      await new Promise((r) => setTimeout(r, 220))
      ebu = await measureIntegratedLufsEbur128(outputPath)
    }
    if (ebu == null && authorityEbuIntegrated != null && Number.isFinite(authorityEbuIntegrated)) {
      ebu = authorityEbuIntegrated
    }
    const rmsProxy = analysisAfter.lufs
    if (ebu != null && Number.isFinite(ebu)) {
      analysisAfter = {
        ...analysisAfter,
        lufs: ebu,
        lufsRmsProxy: rmsProxy,
        targetLufsApplied: safeIntegratedLufs,
      }
    } else if (MASTER_DEBUG || LUFS_TRACE) {
      console.warn("[master] EBU-128 measure failed; using RMS-proxy lufs in payload", {
        stamp: LUFS_TRACE ? LUFS_TRACE_BUILD_STAMP : undefined,
        rmsProxyLufs: rmsProxy,
      })
    }
    if (LUFS_TRACE) {
      console.log("[LUFS_TRACE] AUTHORITY_PAYLOAD_LUFS", {
        stamp: LUFS_TRACE_BUILD_STAMP,
        analysisAfterLufs: analysisAfter.lufs,
        lufsRmsProxy: analysisAfter.lufsRmsProxy ?? null,
        ebuSecondPassOk: ebu != null && Number.isFinite(ebu),
        authorityEbuAfterEncode: authorityEbuIntegrated,
        authorityVsPayloadLu:
          authorityEbuIntegrated != null &&
          ebu != null &&
          Number.isFinite(authorityEbuIntegrated) &&
          Number.isFinite(ebu)
            ? Number((ebu - authorityEbuIntegrated).toFixed(3))
            : null,
      })
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
    if (PIPELINE_DEBUG) {
      const sz = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0
      console.log("[pipeline] masterTrack analyzed file", {
        analyzedPath: outputPath,
        bytes: sz,
        loudnormI: safeIntegratedLufs,
        integratedLufs: analysisAfter.lufs,
        lufsRmsProxy: analysisAfter.lufsRmsProxy ?? null,
        stereoWidth: analysisAfter.stereoWidth,
        bassWeight: analysisAfter.bassWeight,
        brightness: analysisAfter.brightness,
        dynamicRange: analysisAfter.dynamicRange,
      })
    }
  }

  const masteringInsights = buildMasteringInsights({
    requestedLufs,
    appliedLufs: safeIntegratedLufs,
    adaptiveLoudness,
    style,
    hotClubProtection,
  })
  if (analysisAfter) {
    analysisAfter = attachMasteringInsightsToAnalysis(analysisAfter, masteringInsights)
  }

  const out = {
    path: outputPath,
    analysisBefore,
    analysisAfter,
    masteringInsights,
  }
  if (MASTER_DEBUG) {
    out.debugInfo = {
      audioFilter: audioFilterFinal,
      requestedLufs,
      loudnormI: safeIntegratedLufs,
      loudnormLRA: lra,
      loudnormTP: tp,
      loudnormTwoPass: usedTwoPass,
      loudnormPass1: loudnormPass1Json,
      gainStagingDb: stagingDb,
      autoPreGainBeforeLoudnormDb: autoPreGainDb,
      adaptiveLoudness,
      adaptivePregainFactors: adaptiveGain.factors,
      transientSafety,
      compressionIntensity: compIntensity,
      hotClubProtection,
      ebuInputIntegrated,
      measuredEbuAfter: analysisAfter?.lufs ?? null,
      authorityEbuIntegrated,
      style,
      stereoEnhance,
      lowEndControl,
      clarityPresence,
    }
  }
  if (LUFS_TRACE) {
    out.lufsTraceMeta = {
      stamp: LUFS_TRACE_BUILD_STAMP,
      incomingTargetLufsRaw: targetLufsIn,
      parsedClient: Number.isFinite(parsedClient) ? parsedClient : null,
      targetLufsResolved: targetLufs,
      requestedLufs,
      safeIntegratedLufs,
      adaptiveBackoffLu: adaptiveLoudness.backoffLu,
      limiterReductionEstimateDb: adaptiveLoudness.limiterReductionEstimateDb,
      pregainAppliedDb: autoPreGainDb,
      transientProtection: adaptiveLoudness.transientProtection,
      loudnormTwoPass: usedTwoPass,
      pass1HasJson: Boolean(loudnormPass1Json?.input_i),
      authorityEbuIntegrated,
      analysisAfterLufs: analysisAfter?.lufs ?? null,
      analysisAfterHasRmsProxy: analysisAfter?.lufsRmsProxy != null,
    }
    console.log(
      "[LUFS_TRACE] AUTHORITY_MASTER_RETURN_FINAL analysisAfter.lufs=",
      analysisAfter?.lufs ?? null,
      "authorityEbuIntegrated=",
      authorityEbuIntegrated,
      "twoPass=",
      usedTwoPass
    )
  }
  return out
}
