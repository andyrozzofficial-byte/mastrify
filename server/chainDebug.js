import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"
import { isMastrifyDebugOn } from "./mastrifyDebug.js"

/** Env MASTRIFY_CHAIN_DEBUG=1 enables chain isolation + movement probes */
export const MASTRIFY_CHAIN_DEBUG = isMastrifyDebugOn(process.env.MASTRIFY_CHAIN_DEBUG)

export const CHAIN_DEBUG_MODES = {
  A: {
    id: "A",
    label: "EQ only",
    stages: { eq: true, comp: false, limiter: false, loudnorm: false, pregain: false },
  },
  B: {
    id: "B",
    label: "EQ + loudnorm only",
    stages: { eq: true, comp: false, limiter: false, loudnorm: true, pregain: false },
  },
  C: {
    id: "C",
    label: "EQ + limiter only",
    stages: { eq: true, comp: false, limiter: true, loudnorm: false, pregain: false },
  },
  D: {
    id: "D",
    label: "EQ + compressor only",
    stages: { eq: true, comp: true, limiter: false, loudnorm: false, pregain: false },
  },
  E: {
    id: "E",
    label: "Full chain",
    stages: { eq: true, comp: true, limiter: true, loudnorm: true, pregain: true },
  },
}

CHAIN_DEBUG_MODES.full = CHAIN_DEBUG_MODES.E

const MODE_ALIASES = {
  a: "A",
  eq: "A",
  "eq-only": "A",
  b: "B",
  loudnorm: "B",
  "eq-loudnorm": "B",
  c: "C",
  limiter: "C",
  "eq-limiter": "C",
  d: "D",
  compressor: "D",
  comp: "D",
  "eq-compressor": "D",
  e: "E",
  full: "E",
}

/**
 * @returns {null | { id: string, label: string, stages: object }}
 */
export function parseChainDebugMode(raw) {
  if (raw == null || raw === "") return null
  const s = String(raw).trim()
  if (!s) return null
  const key = MODE_ALIASES[s.toLowerCase()] ?? s.toUpperCase()
  return CHAIN_DEBUG_MODES[key] ?? null
}

export function chainDebugEnabled(optsMode, envMode = process.env.MASTRIFY_CHAIN_MODE) {
  if (parseChainDebugMode(optsMode)) return true
  if (parseChainDebugMode(envMode)) return true
  return MASTRIFY_CHAIN_DEBUG
}

export function resolveChainDebugMode(optsMode, envMode = process.env.MASTRIFY_CHAIN_MODE) {
  return parseChainDebugMode(optsMode) ?? parseChainDebugMode(envMode) ?? null
}

export function isChainDebugSweepRequested(raw) {
  if (raw === true || raw === 1 || raw === "1" || raw === "true") return true
  return process.env.MASTRIFY_CHAIN_SWEEP === "1"
}

/** Parse ebur128 framelog=verbose lines: M = momentary, S = short-term (LUFS). */
export function parseEbur128VerboseSeries(stderr) {
  const momentary = []
  const shortTerm = []
  if (!stderr || typeof stderr !== "string") {
    return { momentary, shortTerm }
  }
  const lineRe = /^\s*t:\s*[\d.]+\s+M:\s*([-.\d]+|inf)\s+S:\s*([-.\d]+|inf)/gm
  let m
  while ((m = lineRe.exec(stderr)) !== null) {
    const mv = m[1] === "inf" ? null : parseFloat(m[1])
    const sv = m[2] === "inf" ? null : parseFloat(m[2])
    if (Number.isFinite(mv)) momentary.push(mv)
    if (Number.isFinite(sv)) shortTerm.push(sv)
  }
  return { momentary, shortTerm }
}

export function summarizeGainMovement(values) {
  const finite = (values || []).filter((v) => Number.isFinite(v))
  if (finite.length < 4) return null
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length
  const variance = finite.reduce((a, v) => a + (v - mean) ** 2, 0) / finite.length
  const std = Math.sqrt(variance)
  const swingLu = max - min
  return {
    windows: finite.length,
    minLu: Number(min.toFixed(2)),
    maxLu: Number(max.toFixed(2)),
    meanLu: Number(mean.toFixed(2)),
    stdLu: Number(std.toFixed(3)),
    swingLu: Number(swingLu.toFixed(2)),
    pumpingScore: Number((std * 1.25 + swingLu * 0.4).toFixed(3)),
  }
}

/**
 * Probe momentary / short-term loudness movement through an ffmpeg -af chain (null output).
 */
export async function probeMomentaryLufsSeries(filePath, audioFilter = "") {
  if (!ffmpegPath || !filePath) {
    return { momentary: [], shortTerm: [], stderr: "", code: -1 }
  }
  const trimmed = String(audioFilter || "").replace(/,\s*$/, "").trim()
  const af = trimmed
    ? `${trimmed},ebur128=framelog=verbose:metadata=0`
    : "ebur128=framelog=verbose:metadata=0"
  const args = [
    "-hide_banner",
    "-nostats",
    "-i",
    filePath,
    "-vn",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-af",
    af,
    "-f",
    "null",
    "-",
  ]
  return new Promise((resolve) => {
    const ff = spawn(ffmpegPath, args, { shell: false })
    let stderr = ""
    ff.stderr?.on("data", (d) => {
      stderr += d.toString()
    })
    ff.once("error", () => resolve({ momentary: [], shortTerm: [], stderr, code: -1 }))
    ff.once("close", (code) => {
      const series = parseEbur128VerboseSeries(stderr)
      resolve({ ...series, stderr, code })
    })
  })
}

export function buildLoudnormGainReport(pass1Json, measuredOpts = null) {
  if (!pass1Json) return null
  const num = (k) => {
    const v = parseFloat(String(pass1Json[k] ?? "").replace(/"/g, "").trim())
    return Number.isFinite(v) ? v : null
  }
  const inputI = num("input_i")
  const outputI = num("output_i")
  const offsetRaw = num("target_offset") ?? num("offset")
  const offsetApplied = measuredOpts?.offset != null ? parseFloat(measuredOpts.offset) : null
  return {
    inputIntegratedLu: inputI,
    outputIntegratedLu: outputI,
    integratedLiftLu:
      inputI != null && outputI != null ? Number((outputI - inputI).toFixed(2)) : null,
    offsetRawDb: offsetRaw,
    offsetAppliedDb: Number.isFinite(offsetApplied) ? offsetApplied : null,
    offsetStatic: measuredOpts?.staticPass2 === true,
    inputTpDb: num("input_tp"),
    inputLraLu: num("input_lra"),
    outputLraLu: num("output_lra"),
  }
}

/**
 * Compare movement between two probe series (approximates stage-induced gain swing).
 */
export function estimateStageGainSwing(beforeSeries, afterSeries) {
  const b = summarizeGainMovement(beforeSeries?.momentary)
  const a = summarizeGainMovement(afterSeries?.momentary)
  if (!b || !a) return null
  return {
    baselineSwingLu: b.swingLu,
    afterSwingLu: a.swingLu,
    addedSwingLu: Number((a.swingLu - b.swingLu).toFixed(2)),
    addedPumpingScore: Number((a.pumpingScore - b.pumpingScore).toFixed(3)),
    baselineStdLu: b.stdLu,
    afterStdLu: a.stdLu,
  }
}

/**
 * Run isolation probes for modes A–E (null output + ebur128 movement stats).
 * @param {object} opts
 * @param {string} opts.file
 * @param {(modeId: string) => Promise<{ audioFilter: string, loudnorm?: object }>} opts.resolveFilterForMode
 */
export async function runChainIsolationSweep({ file, resolveFilterForMode }) {
  const modeIds = ["A", "B", "C", "D", "E"]
  const inputProbe = await probeMomentaryLufsSeries(file, "")
  const inputMovement = summarizeGainMovement(inputProbe.momentary)

  const modes = []
  for (const id of modeIds) {
    const resolved = await resolveFilterForMode(id)
    const filter = resolved?.audioFilter ?? ""
    const probe = await probeMomentaryLufsSeries(file, filter)
    const movement = summarizeGainMovement(probe.momentary)
    const shortTermMovement = summarizeGainMovement(probe.shortTerm)
    const vsInput = estimateStageGainSwing(inputProbe, probe)
    modes.push({
      mode: id,
      label: CHAIN_DEBUG_MODES[id]?.label ?? id,
      audioFilter: filter,
      loudnorm: resolved?.loudnorm ?? null,
      stages: CHAIN_DEBUG_MODES[id]?.stages ?? null,
      movement,
      shortTermMovement,
      vsInput,
    })
  }

  modes.sort((a, b) => (b.movement?.pumpingScore ?? 0) - (a.movement?.pumpingScore ?? 0))
  const ranked = modes.map((m, i) => ({
    rank: i + 1,
    mode: m.mode,
    label: m.label,
    pumpingScore: m.movement?.pumpingScore ?? null,
    swingLu: m.movement?.swingLu ?? null,
    addedSwingVsInputLu: m.vsInput?.addedSwingLu ?? null,
  }))

  return {
    inputBaseline: inputMovement,
    modes,
    ranking: ranked,
    likelySuspect: ranked[0] ?? null,
    hint:
      "Highest pumpingScore / swingLu usually indicates the stage introducing audible gain movement.",
  }
}

export function logChainDebug(payload) {
  console.log("[master] chain debug", payload)
}
