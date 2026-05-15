/**
 * Adaptive musical mastering decisions — material, tone, stereo, limiter character.
 * Confidence-weighted and intentionally subtle: under-processed > over-corrected.
 */

/** Global subtlety — perceptual moves stay below “mastered sameness”. */
const SUBTLETY = 0.42
const MAX_EQ_DB = 0.16
const MAX_REF_TILT_DB = 0.18

function num(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.trim())
    if (Number.isFinite(n)) return n
  }
  return null
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

function estimateCrestFromAnalysis(analysis, integratedLufs) {
  const peak = num(analysis?.peakDb)
  const lufs = integratedLufs ?? num(analysis?.lufs)
  if (peak != null && lufs != null) return peak - lufs
  return num(analysis?.dynamicRange)
}

/** Deterministic per-mix spread so same LUFS target ≠ same mastering path. */
function materialFingerprintBlend(analysis, ctx) {
  const parts = [
    num(analysis?.dynamicRange),
    num(analysis?.bassWeight),
    num(analysis?.brightness),
    num(analysis?.stereoWidth),
    estimateCrestFromAnalysis(analysis, ctx?.integratedLufs),
    num(ctx?.integratedLufs),
  ]
    .map((v) => (v != null ? Math.round(v * 20) : -999))
    .join("|")
  let h = 0
  for (let i = 0; i < parts.length; i++) h = (Math.imul(31, h) + parts.charCodeAt(i)) | 0
  return Number((0.9 + ((Math.abs(h) % 21) / 21) * 0.14).toFixed(3))
}

/**
 * Low confidence → preserve mix; high confidence → allow gentle corrections.
 */
export function resolveConfidenceWeight(decisionConfidence) {
  const c = clamp(decisionConfidence ?? 0.5, 0, 1)
  if (c < 0.4) return 0.2
  if (c < 0.52) return 0.32 + (c - 0.4) * 0.85
  if (c < 0.68) return 0.42 + (c - 0.52) * 0.95
  return clamp(0.55 + c * 0.38, 0.55, 0.88)
}

function eqGain(db, weight) {
  const g = db * SUBTLETY * weight
  return clamp(g, -MAX_EQ_DB, MAX_EQ_DB)
}

/**
 * Classify what the mix wants — drives intensity, limiter, and tone philosophy.
 */
export function classifyMaterialProfile(analysis, ctx = {}, opts = {}) {
  const dr = num(analysis?.dynamicRange) ?? num(ctx?.dynamicRange)
  const bass = num(analysis?.bassWeight) ?? num(ctx?.bassWeight)
  const bright = num(analysis?.brightness) ?? num(ctx?.brightness)
  const stereo = num(analysis?.stereoWidth) ?? num(ctx?.stereoWidth)
  const lufs = num(ctx?.integratedLufs) ?? num(analysis?.lufs)
  const peakDb = num(analysis?.peakDb) ?? num(ctx?.peakDb)
  const energy = analysis?.energy
  const crest = estimateCrestFromAnalysis(analysis, lufs)
  const requestedLufs = num(opts?.requestedLufs)

  const scores = {
    pre_limited: 0,
    ambient: 0,
    acoustic: 0,
    edm: 0,
    rock_pop: 0,
    cinematic: 0,
  }
  const signals = []

  if (dr != null && dr < 5.5) {
    scores.pre_limited += 0.45
    signals.push("collapsedDR")
  }
  if (dr != null && dr < 7) scores.pre_limited += 0.25
  if (lufs != null && lufs > -10.5 && dr != null && dr < 7) {
    scores.pre_limited += 0.35
    signals.push("hotAndDense")
  }
  if (peakDb != null && peakDb > -1.2 && dr != null && dr < 8) {
    scores.pre_limited += 0.2
    signals.push("nearClip")
  }

  if (dr != null && dr > 13 && bass != null && bass < 0.42) {
    scores.ambient += 0.4
    signals.push("openWideDR")
  }
  if (bright != null && bright < 0.38 && dr != null && dr > 11) {
    scores.ambient += 0.25
    signals.push("softTop")
  }
  if (energy === "low" && dr != null && dr > 10) scores.ambient += 0.2

  if (dr != null && dr > 11 && crest != null && crest >= 10) {
    scores.acoustic += 0.4
    signals.push("openCrest")
  }
  if (bass != null && bass < 0.48 && dr != null && dr > 9) scores.acoustic += 0.2

  if (bass != null && bass > 0.48 && energy === "high") {
    scores.edm += 0.45
    signals.push("denseLowSub")
  }
  if (bass != null && bass > 0.42 && dr != null && dr >= 6 && dr <= 11) {
    scores.edm += 0.3
  }
  if (bright != null && bright > 0.38 && bass != null && bass > 0.4) scores.edm += 0.15

  if (dr != null && dr >= 8 && dr <= 12) scores.rock_pop += 0.35
  if (crest != null && crest >= 8 && crest < 12) scores.rock_pop += 0.2
  if (stereo != null && stereo >= 0.4 && stereo <= 0.62) scores.rock_pop += 0.15

  if (dr != null && dr > 14) {
    scores.cinematic += 0.4
    signals.push("veryHighDR")
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const profile = ranked[0][0]
  const best = ranked[0][1]
  const second = ranked[1]?.[1] ?? 0
  const margin = best - second
  const decisionConfidence = Number(
    clamp(0.32 + margin * 2.1 + Math.min(signals.length, 5) * 0.035, 0.32, 0.96).toFixed(2)
  )
  const confidenceWeight = resolveConfidenceWeight(decisionConfidence)
  const preserveMix = decisionConfidence < 0.48 || margin < 0.12
  const fingerprintBlend = materialFingerprintBlend(analysis, ctx)

  const intensityByProfile = {
    pre_limited: 0.1,
    ambient: 0.24,
    acoustic: 0.34,
    rock_pop: 0.46,
    edm: 0.5,
    cinematic: 0.28,
  }

  const limiterPressureByProfile = {
    pre_limited: 0.07,
    ambient: 0.18,
    acoustic: 0.26,
    rock_pop: 0.44,
    edm: 0.48,
    cinematic: 0.22,
  }

  const compDensityByProfile = {
    pre_limited: 0.12,
    ambient: 0.22,
    acoustic: 0.28,
    rock_pop: 0.44,
    edm: 0.55,
    cinematic: 0.24,
  }

  let processingIntensity =
    (intensityByProfile[profile] ?? 0.42) * confidenceWeight * fingerprintBlend
  if (preserveMix) processingIntensity *= 0.72

  if (requestedLufs != null && requestedLufs >= -10 && profile === "edm") {
    processingIntensity = Math.min(processingIntensity + 0.06, 0.58)
  }
  if (requestedLufs != null && requestedLufs <= -13.5 && profile === "acoustic") {
    processingIntensity *= 0.88
  }

  return {
    profile,
    decisionConfidence,
    confidenceWeight: Number(confidenceWeight.toFixed(3)),
    preserveMix,
    fingerprintBlend,
    signals,
    scores,
    profileMargin: Number(margin.toFixed(2)),
    processingIntensity: Number(clamp(processingIntensity, 0.06, 0.62).toFixed(3)),
    limiterPressureCap: Number(
      clamp((limiterPressureByProfile[profile] ?? 0.4) * confidenceWeight, 0.06, 0.55).toFixed(3)
    ),
    compDensityBias: Number(
      clamp((compDensityByProfile[profile] ?? 0.4) * confidenceWeight, 0.08, 0.58).toFixed(3)
    ),
    crestDb: crest != null ? Number(crest.toFixed(2)) : null,
    dynamicRange: dr,
    philosophy: preserveMix ? "preserve-mix-low-confidence" : "confidence-weighted-subtle",
  }
}

const PROFILE_TONE_CHARACTER = {
  pre_limited: { air: 0, presence: 0, mud: 0 },
  ambient: { air: -0.03, presence: -0.08, mud: 0.02 },
  acoustic: { air: 0.04, presence: 0.02, mud: -0.04 },
  rock_pop: { air: 0.02, presence: 0.06, mud: -0.05 },
  edm: { air: 0.01, presence: -0.02, mud: -0.1 },
  cinematic: { air: 0.05, presence: -0.04, mud: -0.03 },
}

/**
 * Perceptual tonal corrections — only when confident and clearly needed.
 */
export function buildPerceptualToneAdjustments(analysis, materialProfile) {
  const bass = num(analysis?.bassWeight)
  const bright = num(analysis?.brightness)
  const dr = num(analysis?.dynamicRange)
  const crest = estimateCrestFromAnalysis(analysis)
  const midRatio =
    bass != null && bright != null ? Math.max(0, 1 - bass - bright) : null
  const weight = materialProfile?.confidenceWeight ?? 0.5
  const preserveMix = materialProfile?.preserveMix
  const profile = materialProfile?.profile ?? "rock_pop"
  const char = PROFILE_TONE_CHARACTER[profile] ?? PROFILE_TONE_CHARACTER.rock_pop

  if (preserveMix || weight < 0.28) {
    return { tone: {}, filters: "", notes: ["preserveMix"], active: false, weight }
  }

  const scale = weight * (materialProfile?.processingIntensity ?? 0.4)

  const tone = {
    lowGain: 0,
    mudGain: (char.mud ?? 0) * scale,
    mudWideGain: 0,
    airGain: (char.air ?? 0) * scale,
    dipAboveAirGain: 0,
    highShelf9k: 0,
    presenceDb: (char.presence ?? 0) * scale,
  }
  const filters = []
  const notes = []

  if (bright != null && bright > 0.58 && weight > 0.45) {
    tone.dipAboveAirGain -= 0.06 * scale
    tone.presenceDb -= 0.12 * scale
    tone.highShelf9k -= 0.04 * scale
    filters.push(`equalizer=f=6400:t=q:w=1.15:g=${eqGain(-0.14, weight)}`)
    filters.push(`equalizer=f=10200:t=q:w=0.95:g=${eqGain(-0.1, weight)}`)
    notes.push("fatigueUpperMids")
  }

  if (
    midRatio != null &&
    midRatio < 0.26 &&
    bass != null &&
    bass < 0.38 &&
    weight > 0.5 &&
    profile !== "ambient"
  ) {
    tone.mudWideGain += 0.06 * scale
    filters.push(`equalizer=f=340:t=q:w=1:g=${eqGain(0.1, weight)}`)
    notes.push("thinLowMids")
  }

  if (bass != null && bass > 0.56 && weight > 0.48 && profile === "edm") {
    tone.mudGain -= 0.08 * scale
    filters.push(`equalizer=f=92:t=q:w=0.9:g=${eqGain(-0.12, weight)}`)
    notes.push("subClarity")
  }

  if (
    bright != null &&
    bright < 0.2 &&
    midRatio != null &&
    midRatio > 0.34 &&
    weight > 0.52 &&
    (profile === "rock_pop" || profile === "acoustic")
  ) {
    tone.presenceDb += 0.15 * scale
    filters.push(`equalizer=f=3900:t=q:w=0.92:g=${eqGain(0.1, weight)}`)
    notes.push("vocalPresence")
  }

  if (crest != null && crest >= 10 && dr != null && dr > 11) {
    notes.push("transientContrastPreserved")
  }

  if (materialProfile?.profile === "pre_limited") {
    for (const k of Object.keys(tone)) tone[k] = 0
    return { tone, filters: "", notes: ["preLimitedBypass"], active: false, weight }
  }

  return {
    tone,
    filters: filters.filter(Boolean).join(","),
    notes,
    active: notes.length > 0 || Object.values(tone).some((v) => Math.abs(v) > 0.02),
    weight,
  }
}

/**
 * Adaptive stereo — mono-safe lows without collapsing width; genre-specific.
 */
export function buildAdaptiveStereoPlan(analysis, materialProfile, stereoEnhanceSlider = 50) {
  const bass = num(analysis?.bassWeight)
  const stereo = num(analysis?.stereoWidth)
  const profile = materialProfile?.profile ?? "rock_pop"
  const weight = materialProfile?.confidenceWeight ?? 0.5
  const preserveMix = materialProfile?.preserveMix

  let effectiveStereoEnhance = stereoEnhanceSlider
  const notes = []

  if (preserveMix || weight < 0.3) {
    return {
      effectiveStereoEnhance: stereoEnhanceSlider,
      filters: "",
      notes: ["preserveStereo"],
      sideControl: "balanced",
      weight,
    }
  }

  const biasScale = weight * 6

  if (bass != null && bass > 0.4) {
    notes.push("monoSafeLowEnd")
    effectiveStereoEnhance = Math.max(
      stereo != null && stereo > 0.55 ? stereoEnhanceSlider - 3 : stereoEnhanceSlider - 5,
      42
    )
  }

  if (profile === "ambient") {
    effectiveStereoEnhance = Math.min(100, effectiveStereoEnhance + biasScale * 0.7)
    notes.push("spaciousAmbient")
  } else if (profile === "acoustic") {
    effectiveStereoEnhance = Math.min(100, effectiveStereoEnhance + biasScale * 0.45)
    notes.push("naturalWidth")
  } else if (profile === "edm") {
    effectiveStereoEnhance = Math.max(0, effectiveStereoEnhance - biasScale * 0.35)
    notes.push("focusedClubImage")
  } else if (profile === "pre_limited") {
    effectiveStereoEnhance = stereoEnhanceSlider
    notes.push("preserveStereoImage")
  }

  if (stereo != null && stereo < 0.3 && profile !== "pre_limited") {
    effectiveStereoEnhance = Math.min(100, effectiveStereoEnhance + biasScale * 0.9)
    notes.push("gentleWiden")
  }
  if (stereo != null && stereo > 0.7) {
    effectiveStereoEnhance = Math.max(45, effectiveStereoEnhance - biasScale * 0.5)
    notes.push("retainExistingWidth")
  }

  const hfWiden =
    profile === "ambient" || profile === "cinematic"
      ? `equalizer=f=12500:t=q:w=0.88:g=${eqGain(0.08, weight)},`
      : profile === "acoustic"
        ? `equalizer=f=11800:t=q:w=0.9:g=${eqGain(0.05, weight)},`
        : ""

  return {
    effectiveStereoEnhance: Math.round(effectiveStereoEnhance),
    filters: hfWiden,
    notes,
    sideControl: profile === "edm" ? "tight" : profile === "ambient" ? "open" : "balanced",
    weight,
  }
}

/**
 * Limiter character — slow/transparent; preserves microdynamics and transient contrast.
 */
export function buildLimiterCharacter(analysis, materialProfile) {
  const bass = num(analysis?.bassWeight)
  const bright = num(analysis?.brightness)
  const dr = num(analysis?.dynamicRange)
  const crest = estimateCrestFromAnalysis(analysis)
  const profile = materialProfile?.profile ?? "rock_pop"
  const weight = materialProfile?.confidenceWeight ?? 0.5
  const cap = (materialProfile?.limiterPressureCap ?? 0.4) * weight

  let transientType = "balanced"
  if (profile === "pre_limited") transientType = "pre_limited"
  else if (bass != null && bass > 0.52 && crest != null && crest < 10) transientType = "kick"
  else if (bright != null && bright > 0.52 && dr != null && dr < 9) transientType = "dense_synth"
  else if (bright != null && bright > 0.48 && profile !== "acoustic") transientType = "cymbal"
  else if (crest != null && crest >= 11) transientType = "vocal"
  else if (dr != null && dr > 12) transientType = "acoustic_peak"

  const presets = {
    kick: { attack: 52, release: 380, limit: 0.995, levelOut: 0.995 },
    snare: { attack: 24, release: 240, limit: 0.995, levelOut: 0.994 },
    vocal: { attack: 44, release: 340, limit: 0.996, levelOut: 0.995 },
    cymbal: { attack: 14, release: 120, limit: 0.996, levelOut: 0.995 },
    dense_synth: { attack: 32, release: 280, limit: 0.995, levelOut: 0.994 },
    acoustic_peak: { attack: 48, release: 360, limit: 0.997, levelOut: 0.996 },
    pre_limited: { attack: 62, release: 450, limit: 0.998, levelOut: 0.997 },
    balanced: { attack: 38, release: 340, limit: 0.996, levelOut: 0.995 },
  }

  const base = presets[transientType] ?? presets.balanced
  const pressure = clamp(cap, 0.05, 0.52)

  return {
    transientType,
    attack: Math.round(base.attack + (1 - pressure) * 16),
    release: Math.round(base.release + (1 - pressure) * 90),
    limit: Number((base.limit + (1 - pressure) * 0.002).toFixed(4)),
    levelOut: Number((base.levelOut + (1 - pressure) * 0.002).toFixed(4)),
    transparentGoal: true,
    microdynamicPreserve: true,
    pressure: Number(pressure.toFixed(3)),
  }
}

/**
 * Reference — tonal/spatial tilt only; never loudness or density cloning.
 */
export function buildReferenceSpectralPlan(sourceAnalysis, referenceAnalysis, materialProfile) {
  if (!sourceAnalysis || !referenceAnalysis) {
    return { active: false, filters: "", notes: [], stereoEnhanceBias: 0 }
  }
  const weight = materialProfile?.confidenceWeight ?? 0.5
  if (weight < 0.42 || materialProfile?.preserveMix) {
    return {
      active: false,
      filters: "",
      notes: ["refSkippedLowConfidence"],
      stereoEnhanceBias: 0,
      matchPhilosophy: "spectral-tilt-not-lufs",
    }
  }

  const srcBass = num(sourceAnalysis.bassWeight)
  const refBass = num(referenceAnalysis.bassWeight)
  const srcBright = num(sourceAnalysis.brightness)
  const refBright = num(referenceAnalysis.brightness)
  const srcStereo = num(sourceAnalysis.stereoWidth)
  const refStereo = num(referenceAnalysis.stereoWidth)

  const filters = []
  const notes = []
  const maxTilt = MAX_REF_TILT_DB * weight

  if (srcBass != null && refBass != null) {
    const d = clamp((refBass - srcBass) * 0.75, -maxTilt, maxTilt)
    if (Math.abs(d) > 0.09) {
      filters.push(`equalizer=f=95:t=q:w=0.92:g=${d.toFixed(3)}`)
      notes.push(`refBassTilt=${d.toFixed(2)}dB`)
    }
  }
  if (srcBright != null && refBright != null) {
    const d = clamp((refBright - srcBright) * 0.85, -maxTilt, maxTilt)
    if (Math.abs(d) > 0.09) {
      filters.push(`equalizer=f=10800:t=q:w=0.92:g=${d.toFixed(3)}`)
      notes.push(`refAirTilt=${d.toFixed(2)}dB`)
    }
  }

  const stereoDelta =
    srcStereo != null && refStereo != null ? refStereo - srcStereo : 0
  const stereoEnhanceBias = clamp(Math.round(stereoDelta * 22 * weight), -4, 4)

  return {
    active: notes.length > 0 || Math.abs(stereoEnhanceBias) > 0,
    filters: filters.join(","),
    notes,
    stereoEnhanceBias,
    matchPhilosophy: "tonal-spatial-perceptual-not-lufs",
  }
}

/** User-facing confidence / transparency messages. */
export function buildMasteringConfidenceMessages({
  materialProfile,
  adaptiveTransparency,
  referencePlan,
  perceptualTone,
}) {
  const messages = []
  const profile = materialProfile?.profile

  if (materialProfile?.preserveMix) {
    messages.push({
      id: "low_confidence",
      level: "info",
      text: "Low profile confidence — preserving your mix with minimal intervention",
    })
  }

  if (profile === "pre_limited") {
    messages.push({
      id: "pre_limited",
      level: "info",
      text: "Already heavily limited mix detected — minimal mastering applied",
    })
  } else if (materialProfile?.processingIntensity != null && materialProfile.processingIntensity < 0.3) {
    messages.push({
      id: "minimal",
      level: "info",
      text: "Slightly under-processed on purpose — musicality over technical polish",
    })
  }

  if (adaptiveTransparency?.material) {
    messages.push({
      id: "transparent_mode",
      level: "positive",
      text: "Transparent loudness mode — transients and arrangement movement preserved",
    })
  } else if (adaptiveTransparency?.active) {
    messages.push({
      id: "soft_streaming",
      level: "info",
      text: "Soft loudness window — punch and microdynamics prioritized",
    })
  }

  if (materialProfile?.profile === "acoustic" || materialProfile?.profile === "cinematic") {
    messages.push({
      id: "dynamic_preserved",
      level: "positive",
      text: "Dynamic material preserved — chorus lift and emotional movement retained",
    })
  }

  if (perceptualTone?.active && !materialProfile?.preserveMix) {
    messages.push({
      id: "perceptual_tone",
      level: "info",
      text: "Subtle perceptual balance — fatigue-prone bands eased only where needed",
    })
  }

  if (referencePlan?.active) {
    messages.push({
      id: "reference_tilt",
      level: "info",
      text: "Reference used for tonal and spatial tilt only (not loudness or density)",
    })
  }

  return messages.filter((m) => !m.hidden)
}

/**
 * Single decision bundle for masterTrack.
 */
export function buildMasteringDecisions({
  analysis,
  ctx,
  adaptiveTransparency,
  referenceAnalysis,
  stereoEnhance = 50,
  requestedLufs = -14,
  style = "STREAM",
}) {
  const materialProfile = classifyMaterialProfile(analysis, ctx, { requestedLufs, style })
  const perceptualTone = buildPerceptualToneAdjustments(analysis, materialProfile)
  const stereoPlan = buildAdaptiveStereoPlan(analysis, materialProfile, stereoEnhance)
  const limiterCharacter = buildLimiterCharacter(analysis, materialProfile)
  const referencePlan = buildReferenceSpectralPlan(
    analysis,
    referenceAnalysis,
    materialProfile
  )
  const confidenceMessages = buildMasteringConfidenceMessages({
    materialProfile,
    adaptiveTransparency,
    referencePlan,
    perceptualTone,
  })

  return {
    materialProfile,
    perceptualTone,
    stereoPlan,
    limiterCharacter,
    referencePlan,
    confidenceMessages,
    globalWeight: materialProfile.confidenceWeight,
    philosophy: materialProfile.philosophy,
    sectionAware: { enabled: false, note: "future: verse/chorus/drop intensity" },
  }
}

export function applyPerceptualToneToBase(tone, perceptualTone) {
  if (!tone || !perceptualTone?.tone || !perceptualTone.active) return tone
  const w = perceptualTone.weight ?? 0.5
  const d = perceptualTone.tone
  return {
    ...tone,
    lowGain: tone.lowGain + (d.lowGain ?? 0) * w,
    mudGain: tone.mudGain + (d.mudGain ?? 0) * w,
    mudWideGain: tone.mudWideGain + (d.mudWideGain ?? 0) * w,
    airGain: tone.airGain + (d.airGain ?? 0) * w,
    dipAboveAirGain: tone.dipAboveAirGain + (d.dipAboveAirGain ?? 0) * w,
    highShelf9k: tone.highShelf9k + (d.highShelf9k ?? 0) * w,
    presenceDb: (tone.presenceDb ?? 0) + (d.presenceDb ?? 0) * w,
  }
}

export function mergeProcessingIntensity(baseIntensity, materialProfile) {
  const materialScale = materialProfile?.processingIntensity ?? 0.4
  const density = materialProfile?.compDensityBias ?? 0.4
  const weight = materialProfile?.confidenceWeight ?? 0.5
  const blend = materialProfile?.fingerprintBlend ?? 1
  const underProcessBias = 0.88
  return clamp(
    baseIntensity * materialScale * (0.5 + density * 0.35) * weight * blend * underProcessBias,
    0.05,
    0.72
  )
}
