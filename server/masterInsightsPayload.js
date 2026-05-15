/**
 * JSON-safe mastering insights for the result UI (adaptive loudness, descriptors).
 */

function finiteNum(v, fallback = NaN) {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.trim())
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export function buildMasteringInsights({
  requestedLufs,
  appliedLufs,
  adaptiveLoudness,
  style,
  hotClubProtection,
}) {
  const requested = finiteNum(requestedLufs, -14)
  const applied = finiteNum(appliedLufs, requested)
  const backoff = finiteNum(adaptiveLoudness?.backoffLu, 0)
  const adaptiveApplied = backoff > 0.05
  const transientProtection = Boolean(adaptiveLoudness?.transientProtection?.active)

  return {
    requestedLufs: requested,
    appliedLufs: applied,
    adaptiveApplied,
    adaptiveBackoffLu: Number(backoff.toFixed(2)),
    transientProtectionActive: transientProtection || adaptiveApplied,
    hotClubProtection: Boolean(hotClubProtection),
    style: typeof style === "string" ? style : "STREAM",
  }
}

export function attachMasteringInsightsToAnalysis(analysis, insights) {
  if (!analysis || typeof analysis !== "object" || !insights) return analysis
  return {
    ...analysis,
    targetLufsRequested: insights.requestedLufs,
    targetLufsApplied: insights.appliedLufs,
    adaptiveApplied: insights.adaptiveApplied,
    adaptiveBackoffLu: insights.adaptiveBackoffLu,
    transientProtectionActive: insights.transientProtectionActive,
  }
}

export function serializeMasteringInsightsForJson(raw) {
  if (!raw || typeof raw !== "object") return null
  const requested = finiteNum(raw.requestedLufs, NaN)
  const applied = finiteNum(raw.appliedLufs, NaN)
  const backoff = finiteNum(raw.adaptiveBackoffLu, NaN)
  if (!Number.isFinite(requested)) return null
  return {
    requestedLufs: requested,
    ...(Number.isFinite(applied) ? { appliedLufs: applied } : {}),
    adaptiveApplied: Boolean(raw.adaptiveApplied),
    ...(Number.isFinite(backoff) ? { adaptiveBackoffLu: backoff } : {}),
    transientProtectionActive: Boolean(raw.transientProtectionActive),
    hotClubProtection: Boolean(raw.hotClubProtection),
    style: typeof raw.style === "string" ? raw.style : "STREAM",
  }
}
