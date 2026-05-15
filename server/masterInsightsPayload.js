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
  adaptiveTransparency,
  softLoudnessWindow,
  loudnessPhilosophyScore,
}) {
  const requested = finiteNum(requestedLufs, -14)
  const applied = finiteNum(appliedLufs, requested)
  const backoff = finiteNum(adaptiveLoudness?.backoffLu, 0)
  const adaptiveApplied = backoff > 0.05
  const transientProtection = Boolean(adaptiveLoudness?.transientProtection?.active)
  const materialTransparent = Boolean(adaptiveTransparency?.material)
  const softTargetActive = Boolean(softLoudnessWindow?.philosophy !== "exact")

  return {
    requestedLufs: requested,
    appliedLufs: applied,
    adaptiveApplied,
    adaptiveBackoffLu: Number(backoff.toFixed(2)),
    transientProtectionActive: transientProtection || adaptiveApplied || materialTransparent,
    hotClubProtection: Boolean(hotClubProtection),
    style: typeof style === "string" ? style : "STREAM",
    materialTransparent,
    adaptiveTransparentMode: Boolean(adaptiveTransparency?.active),
    softTargetWindow: softLoudnessWindow
      ? {
          acceptableMin: softLoudnessWindow.acceptableMin,
          acceptableMax: softLoudnessWindow.acceptableMax,
          floorMin: softLoudnessWindow.floorMin,
          undershootBudgetLu: softLoudnessWindow.undershootBudgetLu,
          philosophy: softLoudnessWindow.philosophy,
        }
      : null,
    loudnessPhilosophyScore: loudnessPhilosophyScore?.score ?? null,
    prioritizeTransients: loudnessPhilosophyScore?.prioritizeTransients ?? true,
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
    materialTransparent: insights.materialTransparent,
    adaptiveTransparentMode: insights.adaptiveTransparentMode,
    softTargetWindow: insights.softTargetWindow,
    loudnessPhilosophyScore: insights.loudnessPhilosophyScore,
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
    materialTransparent: Boolean(raw.materialTransparent),
    adaptiveTransparentMode: Boolean(raw.adaptiveTransparentMode),
    ...(raw.softTargetWindow ? { softTargetWindow: raw.softTargetWindow } : {}),
    ...(raw.loudnessPhilosophyScore != null
      ? { loudnessPhilosophyScore: raw.loudnessPhilosophyScore }
      : {}),
  }
}
