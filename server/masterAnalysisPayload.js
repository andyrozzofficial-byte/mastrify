/**
 * Master /analyze payloads must be JSON-serializable. NaN/Infinity stringify to `null`,
 * which breaks numeric comparison metrics in the client.
 *
 * "Clarity" is derived on the frontend from brightness + stereoWidth — not a backend field.
 */

const METRIC_KEYS = ["lufs", "dynamicRange", "stereoWidth", "bassWeight", "brightness", "mixQuality"]

/** UI comparison keys (MasterResultClient) — logged alongside raw analyzer output */
export const UI_COMPARISON_METRIC_KEYS = ["lufs", "dynamicRange", "stereoWidth", "bassWeight", "brightness"]

/**
 * Log raw return value from analyzeTrack(outputPath) before any serialization.
 * Surfaces null/undefined, wrong types, and non-finite numbers that become JSON null.
 */
export function logRawPostMasterAnalyzeTrack(outputPath, raw) {
  console.log("[POST_MASTER] analyzeTrack(outputPath) path:", outputPath)
  if (raw == null || typeof raw !== "object") {
    console.log("[POST_MASTER] analyzeTrack(outputPath) raw:", raw === null ? "<null>" : typeof raw)
    return
  }
  const diag = {}
  for (const k of UI_COMPARISON_METRIC_KEYS) {
    const v = raw[k]
    diag[k] = {
      value: v,
      typeof: typeof v,
      isFiniteNumber: typeof v === "number" && Number.isFinite(v),
      isNullJsonRisk: typeof v === "number" && !Number.isFinite(v),
    }
  }
  console.log("[POST_MASTER] analyzeTrack(outputPath) raw UI-metric diag:", JSON.stringify(diag))
  try {
    const probe = JSON.stringify(raw, (_key, v) => {
      if (typeof v === "number" && !Number.isFinite(v)) return `__nonfinite__:${String(v)}`
      return v
    })
    console.log("[POST_MASTER] analyzeTrack(outputPath) full object JSON (nonfinite tagged):", probe)
  } catch (e) {
    console.error("[POST_MASTER] analyzeTrack(outputPath) JSON.stringify failed:", e?.message || e)
  }
}

/**
 * Log raw vs serialized analysisAfter + what survives JSON.stringify (as sent to client).
 */
export function logAnalysisAfterSerializationPipeline(raw, serialized) {
  console.log("[POST_MASTER] serializeMasterAnalysisForJson('after') INPUT (UI keys only):")
  console.log(
    JSON.stringify(
      Object.fromEntries(UI_COMPARISON_METRIC_KEYS.map((k) => [k, raw == null ? null : raw[k]]))
    )
  )
  console.log("[POST_MASTER] serializeMasterAnalysisForJson('after') OUTPUT (UI keys only):")
  console.log(
    JSON.stringify(
      Object.fromEntries(UI_COMPARISON_METRIC_KEYS.map((k) => [k, serialized == null ? null : serialized[k]]))
    )
  )
  try {
    const wire = JSON.stringify({ analysisAfter: serialized })
    const back = JSON.parse(wire).analysisAfter
    const afterRoundTrip = Object.fromEntries(
      UI_COMPARISON_METRIC_KEYS.map((k) => [k, back == null ? undefined : back[k]])
    )
    console.log("[POST_MASTER] analysisAfter after JSON.stringify→parse (wire-level, as axios sees):")
    console.log(JSON.stringify(afterRoundTrip))
  } catch (e) {
    console.error("[POST_MASTER] analysisAfter wire round-trip failed:", e?.message || e)
  }
}

/**
 * Log the exact analysisAfter object attached to res.json (post-serialize).
 */
export function logFinalMasterJsonPayload(analysisAfterSerialized) {
  const slice =
    analysisAfterSerialized && typeof analysisAfterSerialized === "object"
      ? {
          lufs: analysisAfterSerialized.lufs,
          dynamicRange: analysisAfterSerialized.dynamicRange,
          stereoWidth: analysisAfterSerialized.stereoWidth,
          bassWeight: analysisAfterSerialized.bassWeight,
          brightness: analysisAfterSerialized.brightness,
          mixQuality: analysisAfterSerialized.mixQuality,
          issuesCount: Array.isArray(analysisAfterSerialized.issues) ? analysisAfterSerialized.issues.length : 0,
        }
      : null
  console.log("[POST /master] final res.json analysisAfter metric slice:", JSON.stringify(slice))
  try {
    const full = JSON.stringify({
      success: true,
      analysisAfter: analysisAfterSerialized,
    })
    console.log("[POST /master] final JSON byte length (success + analysisAfter only):", full.length)
  } catch (e) {
    console.error("[POST /master] final JSON stringify check failed:", e?.message || e)
  }
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
