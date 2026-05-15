export type MasterStylePreset = "STREAM" | "CLUB" | "LOUD" | "WARM" | "FESTIVAL"

export type MasteringInsightsInput = {
  requestedLufs?: number | null
  appliedLufs?: number | null
  measuredLufs?: number | null
  adaptiveApplied?: boolean
  backoffLu?: number
  transientProtection?: boolean
  style?: MasterStylePreset | string
}

export type AnalysisMetrics = {
  lufs?: unknown
  dynamicRange?: unknown
  stereoWidth?: unknown
  bassWeight?: unknown
  brightness?: unknown
  targetLufsApplied?: unknown
  targetLufsRequested?: unknown
  adaptiveApplied?: unknown
  adaptiveBackoffLu?: unknown
  transientProtectionActive?: unknown
}

const LOUDNESS_PROFILES: { lufs: number; title: string; subtitle: string }[] = [
  { lufs: -14, title: "Streaming Optimized", subtitle: "Balanced loudness for playlists" },
  { lufs: -13, title: "YouTube Optimized", subtitle: "Clear and consistent online playback" },
  { lufs: -11, title: "Spotify Loud Optimized", subtitle: "Punchy streaming presence" },
  { lufs: -9, title: "Club Optimized", subtitle: "Adaptive club loudness" },
]

export function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const t = v.trim()
    if (t === "") return null
    const n = Number(t)
    if (Number.isFinite(n)) return n
  }
  return null
}

function nearestProfile(lufs: number) {
  return LOUDNESS_PROFILES.reduce((best, row) =>
    Math.abs(row.lufs - lufs) < Math.abs(best.lufs - lufs) ? row : best
  )
}

export function smartLoudnessTitle(requestedLufs: number, adaptiveApplied?: boolean): string {
  const profile = nearestProfile(requestedLufs)
  if (requestedLufs <= -10 && adaptiveApplied) {
    if (requestedLufs >= -9.5) return "Adaptive Club Loudness"
    return "Adaptive Loud Master"
  }
  return profile.title
}

export function smartLoudnessSubtitle(
  requestedLufs: number,
  appliedLufs?: number | null,
  adaptiveApplied?: boolean
): string {
  const profile = nearestProfile(requestedLufs)
  if (adaptiveApplied && appliedLufs != null) {
    return "Preserved punch and dynamics"
  }
  return profile.subtitle
}

export function approximateLufsLabel(lufs: number | null | undefined): string | null {
  if (lufs == null || !Number.isFinite(lufs)) return null
  const rounded = Math.round(lufs * 2) / 2
  return `≈ ${rounded.toFixed(1)} LUFS`
}

export function mergeInsightsFromAnalysis(
  sessionTargetLufs: number,
  style: MasterStylePreset,
  analysisAfter?: AnalysisMetrics | null
): MasteringInsightsInput {
  const applied = toFiniteNumber(analysisAfter?.targetLufsApplied)
  const measured = toFiniteNumber(analysisAfter?.lufs)
  const requested =
    toFiniteNumber(analysisAfter?.targetLufsRequested) ?? sessionTargetLufs
  const backoff =
    toFiniteNumber(analysisAfter?.adaptiveBackoffLu) ??
    (applied != null && requested != null ? Math.max(0, requested - applied) : 0)
  const adaptiveApplied =
    analysisAfter?.adaptiveApplied === true ||
    (backoff != null && backoff > 0.05) ||
    (applied != null && requested != null && applied < requested - 0.2)

  return {
    requestedLufs: requested,
    appliedLufs: applied,
    measuredLufs: measured,
    adaptiveApplied,
    backoffLu: backoff ?? 0,
    transientProtection:
      analysisAfter?.transientProtectionActive === true || adaptiveApplied,
    style,
  }
}

export function adaptiveStatusMessage(insights: MasteringInsightsInput): string | null {
  if (!insights.adaptiveApplied) return null
  if (insights.transientProtection) return "Transient-safe loudness — punch preserved"
  return "Adaptive loudness protection applied"
}

export function adaptiveDetailLines(insights: MasteringInsightsInput): string[] {
  if (!insights.adaptiveApplied) return []
  const lines = ["Preserved punch and dynamics"]
  if (insights.backoffLu != null && insights.backoffLu > 0.05) {
    lines.push("Smart loudness shaping for your mix")
  }
  return lines
}

function dynamicsDescriptor(dr: number | null, beforeDr: number | null): string {
  if (dr == null) return "—"
  if (dr >= 11) return "Open"
  if (dr >= 8.5) return "Dynamic"
  if (dr >= 6.5) return "Punchy"
  if (beforeDr != null && dr >= beforeDr - 0.4) return "Controlled"
  return "Tight"
}

function stereoDescriptor(w: number | null): string {
  if (w == null) return "—"
  if (w >= 0.62) return "Wide"
  if (w >= 0.48) return "Balanced"
  return "Focused"
}

function lowEndDescriptor(b: number | null): string {
  if (b == null) return "—"
  if (b >= 0.52) return "Full low-end"
  if (b >= 0.4) return "Solid lows"
  if (b >= 0.28) return "Tight low-end"
  return "Lean lows"
}

function presenceDescriptor(brightness: number | null, stereo: number | null): string {
  const b = brightness ?? 0
  const s = stereo ?? 0
  const blend = b * 0.55 + s * 0.45
  if (blend >= 0.48) return "Bright"
  if (blend >= 0.32) return "Clear"
  if (blend >= 0.2) return "Smooth"
  return "Warm"
}

function loudnessDescriptor(insights: MasteringInsightsInput): { primary: string; secondary: string | null } {
  const display =
    insights.measuredLufs ?? insights.appliedLufs ?? insights.requestedLufs ?? null
  const approx = approximateLufsLabel(display)
  if (insights.adaptiveApplied) {
    return {
      primary: smartLoudnessTitle(insights.requestedLufs ?? -14, true),
      secondary: approx,
    }
  }
  const title = smartLoudnessTitle(insights.requestedLufs ?? -14, false)
  return { primary: title, secondary: approx }
}

export type QualityMetricRow = {
  label: string
  before: string
  after: string
  afterDetail?: string | null
}

export function buildQualityMetricRows(
  before: AnalysisMetrics | null | undefined,
  after: AnalysisMetrics | null | undefined,
  insights: MasteringInsightsInput
): QualityMetricRow[] {
  const drB = toFiniteNumber(before?.dynamicRange)
  const drA = toFiniteNumber(after?.dynamicRange)
  const stB = toFiniteNumber(before?.stereoWidth)
  const stA = toFiniteNumber(after?.stereoWidth)
  const bassB = toFiniteNumber(before?.bassWeight)
  const bassA = toFiniteNumber(after?.bassWeight)
  const brB = toFiniteNumber(before?.brightness)
  const brA = toFiniteNumber(after?.brightness)

  const loud = loudnessDescriptor(insights)

  return [
    {
      label: "Loudness",
      before: approximateLufsLabel(toFiniteNumber(before?.lufs)) ?? "—",
      after: loud.primary,
      afterDetail: loud.secondary,
    },
    {
      label: "Dynamics",
      before: dynamicsDescriptor(drB, null),
      after: dynamicsDescriptor(drA, drB),
      afterDetail: drA != null ? `${drA.toFixed(1)} dB` : null,
    },
    {
      label: "Stereo image",
      before: stereoDescriptor(stB),
      after: stereoDescriptor(stA),
    },
    {
      label: "Low end",
      before: lowEndDescriptor(bassB),
      after: lowEndDescriptor(bassA),
    },
    {
      label: "Presence",
      before: presenceDescriptor(brB, stB),
      after: presenceDescriptor(brA, stA),
    },
  ]
}

export function buildQualityTags(
  after: AnalysisMetrics | null | undefined,
  insights: MasteringInsightsInput
): string[] {
  const tags: string[] = []
  const dr = toFiniteNumber(after?.dynamicRange)
  const bass = toFiniteNumber(after?.bassWeight)
  const stereo = toFiniteNumber(after?.stereoWidth)

  if (insights.adaptiveApplied) tags.push("Transient-safe")
  if (dr != null && dr >= 8) tags.push("Dynamic")
  if (dr != null && dr >= 6.5 && dr < 8) tags.push("Punchy")
  if (dr != null && dr >= 11) tags.push("Open")
  if (bass != null && bass >= 0.4 && bass < 0.52) tags.push("Tight low-end")
  if (bass != null && bass >= 0.52) tags.push("Full lows")
  if (stereo != null && stereo >= 0.58) tags.push("Wide")
  if (insights.requestedLufs != null && insights.requestedLufs >= -10) tags.push("Club-ready")

  return [...new Set(tags)].slice(0, 4)
}

const STYLE_WORD: Record<MasterStylePreset, string> = {
  STREAM: "Streaming",
  WARM: "Warm",
  LOUD: "Punchy",
  CLUB: "Club",
  FESTIVAL: "Open",
}

export function buildMasterDescriptor(
  style: MasterStylePreset,
  after: AnalysisMetrics | null | undefined,
  insights: MasteringInsightsInput
): string {
  const dr = toFiniteNumber(after?.dynamicRange)
  const bass = toFiniteNumber(after?.bassWeight)
  const hot = (insights.requestedLufs ?? -14) >= -10

  let character = "Master"
  if (hot && style === "CLUB") character = insights.adaptiveApplied ? "Adaptive Club Master" : "Club Master"
  else if (style === "CLUB" || style === "FESTIVAL") character = "Club Master"
  else if (style === "LOUD") character = "Punchy Master"
  else if (style === "WARM") character = "Warm Master"
  else if (dr != null && dr >= 10) character = "Open Master"
  else if (bass != null && bass >= 0.48) character = "Tight Low-End Master"
  else if (style === "STREAM") character = "Streaming Master"
  else character = `${STYLE_WORD[style]} Master`

  if (insights.adaptiveApplied && !character.includes("Adaptive")) {
    return character.replace(" Master", " Smart Master")
  }
  return character
}
