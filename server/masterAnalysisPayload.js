/**
 * Master /analyze payloads must be JSON-serializable. NaN/Infinity stringify to `null`,
 * which breaks numeric comparison metrics in the client.
 *
 * "Clarity" is derived on the frontend from brightness + stereoWidth — not a backend field.
 */

const METRIC_KEYS = ["lufs", "dynamicRange", "stereoWidth", "bassWeight", "brightness", "mixQuality"]

/** UI comparison keys — must match MasterResultClient metric rows (excl. derived clarity). */
export const UI_COMPARISON_METRIC_KEYS = ["lufs", "dynamicRange", "stereoWidth", "bassWeight", "brightness"]

/**
 * Pick only the five comparison fields for logs (null-safe, no fabrication).
 */
export function pickFiveComparisonMetrics(obj) {
  if (obj == null || typeof obj !== "object") {
    return {
      lufs: null,
      dynamicRange: null,
      stereoWidth: null,
      bassWeight: null,
      brightness: null,
    }
  }
  return {
    lufs: obj.lufs,
    dynamicRange: obj.dynamicRange,
    stereoWidth: obj.stereoWidth,
    bassWeight: obj.bassWeight,
    brightness: obj.brightness,
  }
}

/**
 * One line per request: stages 1–4 for analysisAfter (same traceId as res.json masterMetricTraceId).
 * stage4 = metrics after JSON.stringify/parse of the same object tree Express puts in res.json (analysisAfter slice).
 */
export function logMasterMetricFiveStagesServer(traceId, rawAfter, serializedAfter) {
  const s1 = pickFiveComparisonMetrics(rawAfter)
  const s2 = pickFiveComparisonMetrics(rawAfter)
  const s3 = pickFiveComparisonMetrics(serializedAfter)
  let stage4 = pickFiveComparisonMetrics(serializedAfter)
  try {
    const wire = JSON.stringify({ analysisAfter: serializedAfter })
    const parsed = JSON.parse(wire)
    stage4 = pickFiveComparisonMetrics(parsed.analysisAfter)
  } catch (e) {
    console.error("[MASTER_METRIC_STAGES] stage4 wire stringify failed:", e?.message || e)
    stage4 = { lufs: null, dynamicRange: null, stereoWidth: null, bassWeight: null, brightness: null }
  }
  console.log(
    "[MASTER_METRIC_STAGES]",
    JSON.stringify({
      traceId,
      stage1_raw_analyzeTrack_outputPath: s1,
      stage2_serializeMasterAnalysisForJson_INPUT: s2,
      stage3_serializeMasterAnalysisForJson_OUTPUT: s3,
      stage4_resJson_wire_analysisAfter: stage4,
    })
  )
}

function finiteNum(v, fallback, key, label) {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.trim())
    if (Number.isFinite(n)) return n
  }
  if (v !== undefined && v !== null) {
    console.warn(`[MASTER_ANALYSIS:${label}] non-finite or non-numeric ${key}:`, v)
  }
  return fallback
}

function cloneJsonSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

/** Log full payload (may be large). Replacer surfaces NaN/Infinity in logs. */
export function logFullMasterAnalysis(label, raw) {
  if (raw == null) {
    console.log(`[MASTER_ANALYSIS] ${label}: <null>`)
    return
  }
  try {
    const json = JSON.stringify(raw, (_k, v) => {
      if (typeof v === "number" && !Number.isFinite(v)) return `__nonfinite__:${v}`
      return v
    })
    console.log(`[MASTER_ANALYSIS] ${label}_FULL:`, json)
  } catch (e) {
    console.error(`[MASTER_ANALYSIS] ${label}: stringify failed`, e)
  }
  const missing = METRIC_KEYS.filter((k) => raw[k] === undefined || raw[k] === null)
  if (missing.length) {
    console.warn(`[MASTER_ANALYSIS] ${label}: missing metric keys:`, missing.join(", "))
  }
}

/**
 * Build a plain, JSON-safe analysis object with the same shape the UI expects.
 * Does not invent musical meaning: only normalizes types / non-finite numbers.
 */
export function serializeMasterAnalysisForJson(raw, label = "analysis") {
  if (raw == null) return null
  if (typeof raw !== "object") return null

  const issuesClone = cloneJsonSafe(raw.issues)
  const recClone = cloneJsonSafe(raw.recommendations)

  return {
    bpm: finiteNum(raw.bpm, 120, "bpm", label),
    energy: typeof raw.energy === "string" ? raw.energy : "medium",
    lufs: finiteNum(raw.lufs, -60, "lufs", label),
    targetLufs: finiteNum(raw.targetLufs, -14, "targetLufs", label),
    lufsAdjustment: finiteNum(raw.lufsAdjustment, 0, "lufsAdjustment", label),
    peakDb: finiteNum(raw.peakDb, -60, "peakDb", label),
    headroomStatus: typeof raw.headroomStatus === "string" ? raw.headroomStatus : "OK",
    dynamicRange: finiteNum(raw.dynamicRange, 0, "dynamicRange", label),
    stereoWidth: finiteNum(raw.stereoWidth, 0, "stereoWidth", label),
    bassWeight: finiteNum(raw.bassWeight, 0, "bassWeight", label),
    brightness: finiteNum(raw.brightness, 0, "brightness", label),
    mixQuality: finiteNum(raw.mixQuality, 0, "mixQuality", label),
    issues: Array.isArray(issuesClone) ? issuesClone : [],
    recommendations: Array.isArray(recClone) ? recClone : [],
  }
}

/** Compact line for outbound /master comparison metrics (post-serialization). */
export function logMasterComparisonMetricsSummary(beforeOut, afterOut) {
  const pick = (o) =>
    o
      ? {
          lufs: o.lufs,
          dynamicRange: o.dynamicRange,
          stereoWidth: o.stereoWidth,
          bassWeight: o.bassWeight,
          brightness: o.brightness,
          mixQuality: o.mixQuality,
        }
      : null
  console.log(
    "[MASTER_ANALYSIS] comparison_metrics_OUT:",
    JSON.stringify({ before: pick(beforeOut), after: pick(afterOut) })
  )
}
