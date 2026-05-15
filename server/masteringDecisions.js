/**
 * Adaptive musical mastering decisions — material, tone, stereo, limiter character.
 * No extra loudness safety layers; scales processing intensity from mix analysis.
 */

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

/**
 * Classify what the mix wants — drives intensity, limiter, and tone philosophy.
 */
export function classifyMaterialProfile(analysis, ctx = {}) {
  const dr = num(analysis?.dynamicRange) ?? num(ctx?.dynamicRange)
  const bass = num(analysis?.bassWeight) ?? num(ctx?.bassWeight)
  const bright = num(analysis?.brightness) ?? num(ctx?.brightness)
  const stereo = num(analysis?.stereoWidth) ?? num(ctx?.stereoWidth)
  const lufs = num(ctx?.integratedLufs) ?? num(analysis?.lufs)
  const peakDb = num(analysis?.peakDb) ?? num(ctx?.peakDb)
  const energy = analysis?.energy
  const crest = estimateCrestFromAnalysis(analysis, lufs)

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

  let profile = "rock_pop"
  let best = scores.rock_pop
  for (const [key, val] of Object.entries(scores)) {
    if (val > best) {
      best = val
      profile = key
    }
  }

  const intensityByProfile = {
    pre_limited: 0.12,
    ambient: 0.28,
    acoustic: 0.38,
    rock_pop: 0.55,
    edm: 0.62,
    cinematic: 0.32,
  }

  const limiterPressureByProfile = {
    pre_limited: 0.08,
    ambient: 0.22,
    acoustic: 0.3,
    rock_pop: 0.52,
    edm: 0.58,
    cinematic: 0.25,
  }

  const compDensityByProfile = {
    pre_limited: 0.15,
    ambient: 0.25,
    acoustic: 0.32,
    rock_pop: 0.5,
    edm: 0.68,
    cinematic: 0.28,
  }

  return {
    profile,
    confidence: Number(Math.min(1, best + 0.15).toFixed(2)),
    signals,
    scores,
    processingIntensity: intensityByProfile[profile] ?? 0.5,
    limiterPressureCap: limiterPressureByProfile[profile] ?? 0.5,
    compDensityBias: compDensityByProfile[profile] ?? 0.5,
    crestDb: crest != null ? Number(crest.toFixed(2)) : null,
    dynamicRange: dr,
  }
}

/**
 * Perceptual tonal corrections (small moves) — layered on style EQ, not replacing it.
 */
export function buildPerceptualToneAdjustments(analysis, materialProfile) {
  const bass = num(analysis?.bassWeight)
  const bright = num(analysis?.brightness)
  const dr = num(analysis?.dynamicRange)
  const midRatio =
    bass != null && bright != null ? Math.max(0, 1 - bass - bright) : null
  const intensity = materialProfile?.processingIntensity ?? 0.5
  const scale = clamp(intensity, 0.15, 1)

  const tone = {
    lowGain: 0,
    mudGain: 0,
    mudWideGain: 0,
    airGain: 0,
    dipAboveAirGain: 0,
    highShelf9k: 0,
    presenceDb: 0,
  }
  const filters = []
  const notes = []

  if (bright != null && bright > 0.52) {
    tone.dipAboveAirGain -= 0.12 * scale
    tone.presenceDb -= 0.35 * scale
    tone.highShelf9k -= 0.08 * scale
    filters.push(`equalizer=f=6200:t=q:w=1.1:g=${(-0.28 * scale).toFixed(3)}`)
    filters.push(`equalizer=f=9800:t=q:w=0.95:g=${(-0.18 * scale).toFixed(3)}`)
    notes.push("harshUpperMids")
  }

  if (midRatio != null && midRatio < 0.28 && bass != null && bass < 0.4) {
    tone.mudWideGain += 0.14 * scale
    tone.mudGain += 0.08 * scale
    filters.push(`equalizer=f=320:t=q:w=1:g=${(0.2 * scale).toFixed(3)}`)
    notes.push("thinLowMids")
  }

  if (bass != null && bass > 0.52) {
    tone.mudGain -= 0.22 * scale
    tone.lowGain -= 0.08 * scale
    filters.push(`equalizer=f=95:t=q:w=0.9:g=${(-0.32 * scale).toFixed(3)}`)
    filters.push(`equalizer=f=55:t=q:w=0.75:g=${(-0.2 * scale).toFixed(3)}`)
    notes.push("subMasking")
  }

  if (bright != null && bright < 0.22 && midRatio != null && midRatio > 0.32) {
    tone.presenceDb += 0.45 * scale
    filters.push(`equalizer=f=3800:t=q:w=0.92:g=${(0.22 * scale).toFixed(3)}`)
    notes.push("vocalPresence")
  }

  if (bright != null && bright > 0.48 && dr != null && dr < 9) {
    filters.push(`equalizer=f=7800:t=q:w=1:g=${(-0.15 * scale).toFixed(3)}`)
    notes.push("fatigueRegion")
  }

  if (materialProfile?.profile === "acoustic") {
    tone.airGain += 0.06 * scale
    tone.mudGain -= 0.06 * scale
  }
  if (materialProfile?.profile === "ambient") {
    tone.highShelf9k -= 0.06 * scale
    tone.presenceDb -= 0.15 * scale
  }
  if (materialProfile?.profile === "pre_limited") {
    for (const k of Object.keys(tone)) tone[k] *= 0.35
  }

  return {
    tone,
    filters: filters.join(","),
    notes,
    active: notes.length > 0,
  }
}

/**
 * Adaptive stereo — mono-safe lows, subtle HF widen on open material.
 */
export function buildAdaptiveStereoPlan(analysis, materialProfile, stereoEnhanceSlider = 50) {
  const bass = num(analysis?.bassWeight)
  const stereo = num(analysis?.stereoWidth)
  const profile = materialProfile?.profile ?? "rock_pop"
  const intensity = materialProfile?.processingIntensity ?? 0.5

  let effectiveStereoEnhance = stereoEnhanceSlider
  const filters = []
  const notes = []

  if (bass != null && bass > 0.38) {
    notes.push("monoCompatibleLowEnd")
    effectiveStereoEnhance = Math.max(0, effectiveStereoEnhance - 8)
  }

  if (profile === "ambient" || profile === "acoustic") {
    effectiveStereoEnhance = Math.min(100, effectiveStereoEnhance + 6)
    notes.push("gentleAirWiden")
  }
  if (profile === "pre_limited") {
    effectiveStereoEnhance = Math.max(0, effectiveStereoEnhance - 12)
    notes.push("preserveStereoImage")
  }
  if (stereo != null && stereo < 0.32) {
    effectiveStereoEnhance = Math.min(100, effectiveStereoEnhance + 10)
    notes.push("narrowMixWiden")
  }
  if (stereo != null && stereo > 0.68) {
    effectiveStereoEnhance = Math.max(0, effectiveStereoEnhance - 6)
    notes.push("alreadyWide")
  }

  const hfWiden =
    profile !== "pre_limited" && profile !== "edm" && intensity < 0.7
      ? `equalizer=f=12000:t=q:w=0.85:g=${(0.12 * intensity).toFixed(3)},`
      : ""

  return {
    effectiveStereoEnhance: Math.round(effectiveStereoEnhance),
    filters: filters.length ? "" : hfWiden,
    notes,
    sideControl: profile === "edm" ? "tight" : profile === "ambient" ? "open" : "balanced",
  }
}

/**
 * Limiter character from dominant transient content — transparent, not flat.
 */
export function buildLimiterCharacter(analysis, materialProfile) {
  const bass = num(analysis?.bassWeight)
  const bright = num(analysis?.brightness)
  const dr = num(analysis?.dynamicRange)
  const crest = estimateCrestFromAnalysis(analysis)
  const profile = materialProfile?.profile ?? "rock_pop"
  const cap = materialProfile?.limiterPressureCap ?? 0.5

  let transientType = "balanced"
  if (profile === "pre_limited") transientType = "pre_limited"
  else if (bass != null && bass > 0.5 && crest != null && crest < 10) transientType = "kick"
  else if (bright != null && bright > 0.5 && dr != null && dr < 9) transientType = "dense_synth"
  else if (bright != null && bright > 0.45) transientType = "cymbal"
  else if (crest != null && crest >= 11) transientType = "vocal"
  else if (dr != null && dr > 12) transientType = "acoustic_peak"

  const presets = {
    kick: { attack: 48, release: 340, limit: 0.993, levelOut: 0.992 },
    snare: { attack: 18, release: 200, limit: 0.994, levelOut: 0.993 },
    vocal: { attack: 36, release: 280, limit: 0.994, levelOut: 0.993 },
    cymbal: { attack: 10, release: 95, limit: 0.995, levelOut: 0.994 },
    dense_synth: { attack: 26, release: 220, limit: 0.993, levelOut: 0.992 },
    acoustic_peak: { attack: 42, release: 320, limit: 0.995, levelOut: 0.994 },
    pre_limited: { attack: 55, release: 400, limit: 0.997, levelOut: 0.996 },
    balanced: { attack: 32, release: 300, limit: 0.994, levelOut: 0.993 },
  }

  const base = presets[transientType] ?? presets.balanced
  const pressure = clamp(cap, 0.08, 1)

  return {
    transientType,
    attack: Math.round(base.attack + (1 - pressure) * 12),
    release: Math.round(base.release + (1 - pressure) * 80),
    limit: Number((base.limit + (1 - pressure) * 0.003).toFixed(4)),
    levelOut: Number((base.levelOut + (1 - pressure) * 0.004).toFixed(4)),
    transparentGoal: true,
  }
}

/**
 * Reference spectral tilt — tonal/density hints only (not LUFS matching).
 */
export function buildReferenceSpectralPlan(sourceAnalysis, referenceAnalysis) {
  if (!sourceAnalysis || !referenceAnalysis) {
    return { active: false, filters: "", notes: [] }
  }
  const srcBass = num(sourceAnalysis.bassWeight)
  const refBass = num(referenceAnalysis.bassWeight)
  const srcBright = num(sourceAnalysis.brightness)
  const refBright = num(referenceAnalysis.brightness)
  const srcStereo = num(sourceAnalysis.stereoWidth)
  const refStereo = num(referenceAnalysis.stereoWidth)

  const filters = []
  const notes = []
  const maxTiltDb = 0.35

  if (srcBass != null && refBass != null) {
    const d = clamp((refBass - srcBass) * 1.2, -maxTiltDb, maxTiltDb)
    if (Math.abs(d) > 0.06) {
      filters.push(`equalizer=f=90:t=q:w=0.9:g=${d.toFixed(3)}`)
      notes.push(`refBassTilt=${d.toFixed(2)}dB`)
    }
  }
  if (srcBright != null && refBright != null) {
    const d = clamp((refBright - srcBright) * 1.4, -maxTiltDb, maxTiltDb)
    if (Math.abs(d) > 0.06) {
      filters.push(`equalizer=f=10500:t=q:w=0.9:g=${d.toFixed(3)}`)
      notes.push(`refAirTilt=${d.toFixed(2)}dB`)
    }
  }

  const stereoDelta =
    srcStereo != null && refStereo != null ? refStereo - srcStereo : 0
  const stereoEnhanceBias = clamp(Math.round(stereoDelta * 40), -8, 8)

  return {
    active: notes.length > 0 || Math.abs(stereoEnhanceBias) > 0,
    filters: filters.join(","),
    notes,
    stereoEnhanceBias,
    matchPhilosophy: "spectral-tilt-not-lufs",
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

  if (profile === "pre_limited") {
    messages.push({
      id: "pre_limited",
      level: "info",
      text: "Already heavily limited mix detected — minimal mastering applied",
    })
  } else if (materialProfile?.processingIntensity != null && materialProfile.processingIntensity < 0.35) {
    messages.push({
      id: "minimal",
      level: "info",
      text: "Minimal mastering applied — preserving source dynamics",
    })
  }

  if (adaptiveTransparency?.material) {
    messages.push({
      id: "transparent_mode",
      level: "positive",
      text: "Transparent loudness mode enabled — musicality over exact LUFS",
    })
  } else if (adaptiveTransparency?.active) {
    messages.push({
      id: "soft_streaming",
      level: "info",
      text: "Soft loudness window — punch and transients prioritized",
    })
  }

  if (materialProfile?.profile === "acoustic" || materialProfile?.profile === "cinematic") {
    messages.push({
      id: "dynamic_preserved",
      level: "positive",
      text: "Dynamic material preserved — open dynamics retained",
    })
  }

  if (perceptualTone?.active) {
    messages.push({
      id: "perceptual_tone",
      level: "info",
      text: "Perceptual tonal balance applied for listening comfort",
    })
  }

  if (referencePlan?.active) {
    messages.push({
      id: "reference_tilt",
      level: "info",
      text: "Reference-aware tonal tilt applied (not LUFS-matched)",
    })
  }

  messages.push({
    id: "section_future",
    level: "hint",
    text: "Section-aware mastering (verse/chorus/drop) — planned",
    hidden: true,
  })

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
}) {
  const materialProfile = classifyMaterialProfile(analysis, ctx)
  const perceptualTone = buildPerceptualToneAdjustments(analysis, materialProfile)
  const stereoPlan = buildAdaptiveStereoPlan(analysis, materialProfile, stereoEnhance)
  const limiterCharacter = buildLimiterCharacter(analysis, materialProfile)
  const referencePlan = buildReferenceSpectralPlan(analysis, referenceAnalysis)
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
    sectionAware: { enabled: false, note: "future: verse/chorus/drop intensity" },
  }
}

export function applyPerceptualToneToBase(tone, perceptualTone) {
  if (!tone || !perceptualTone?.tone) return tone
  const d = perceptualTone.tone
  return {
    ...tone,
    lowGain: tone.lowGain + (d.lowGain ?? 0),
    mudGain: tone.mudGain + (d.mudGain ?? 0),
    mudWideGain: tone.mudWideGain + (d.mudWideGain ?? 0),
    airGain: tone.airGain + (d.airGain ?? 0),
    dipAboveAirGain: tone.dipAboveAirGain + (d.dipAboveAirGain ?? 0),
    highShelf9k: tone.highShelf9k + (d.highShelf9k ?? 0),
    presenceDb: (tone.presenceDb ?? 0) + (d.presenceDb ?? 0),
  }
}

export function mergeProcessingIntensity(baseIntensity, materialProfile, decisions) {
  const materialScale = materialProfile?.processingIntensity ?? 1
  const density = materialProfile?.compDensityBias ?? 0.5
  return clamp(baseIntensity * materialScale * (0.65 + density * 0.5), 0.08, 1)
}
