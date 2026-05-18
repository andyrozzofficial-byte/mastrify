/**
 * Analyze results — musical / human-facing copy only.
 * Thresholds mirror existing analyze page logic; no backend or playback coupling.
 */

export type MixMetricPresentation = {
  vibe: string
  feel: string
  technical: string
}

function pct(n: number): string {
  return `${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`
}

function num(n: unknown, digits = 1): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—"
  return Number.isInteger(n) ? `${n}` : n.toFixed(digits)
}

export function lufsPresentation(lufs: unknown): MixMetricPresentation {
  if (typeof lufs !== "number") {
    return { vibe: "—", feel: "Level reading unavailable", technical: "LUFS —" }
  }
  if (lufs < -14) {
    return {
      vibe: "Quiet",
      feel: "The mix sits below typical release loudness — more gain before the limiter can help.",
      technical: `${lufs.toFixed(1)} LUFS`,
    }
  }
  if (lufs < -10) {
    return {
      vibe: "Controlled",
      feel: "Headroom is healthy — room to lift level in mastering without crushing dynamics.",
      technical: `${lufs.toFixed(1)} LUFS`,
    }
  }
  return {
    vibe: "Present",
    feel: "Overall level feels competitive — mastering can refine tone and punch.",
    technical: `${lufs.toFixed(1)} LUFS`,
  }
}

export function dynamicRangePresentation(dr: unknown): MixMetricPresentation {
  if (typeof dr !== "number") {
    return { vibe: "—", feel: "Dynamics reading unavailable", technical: "DR —" }
  }
  if (dr > 14) {
    return {
      vibe: "Open",
      feel: "Big swings between loud and soft — a touch more glue could feel more release-ready.",
      technical: `${dr.toFixed(1)} dB range`,
    }
  }
  if (dr > 10) {
    return {
      vibe: "Expressive",
      feel: "Dynamics breathe naturally while staying controlled for modern playback.",
      technical: `${dr.toFixed(1)} dB range`,
    }
  }
  return {
    vibe: "Tight",
    feel: "Dynamics feel punchy and consistent — strong foundation for mastering.",
    technical: `${dr.toFixed(1)} dB range`,
  }
}

export function stereoWidthPresentation(width: unknown): MixMetricPresentation {
  const w = typeof width === "number" ? width : 0
  if (w < 0.2) {
    return {
      vibe: "Narrow",
      feel: "Your mix feels slightly narrow compared to modern releases — width on pads and FX can feel more immersive.",
      technical: pct(w),
    }
  }
  if (w < 0.35) {
    return {
      vibe: "Centered",
      feel: "The stereo image is focused — a little more spread up top can add air without losing power.",
      technical: pct(w),
    }
  }
  return {
    vibe: "Wide",
    feel: "The stereo field feels open and spacious — good depth for streaming and clubs.",
    technical: pct(w),
  }
}

export function lowEndPresentation(bass: unknown): MixMetricPresentation {
  const b = typeof bass === "number" ? bass : 0
  if (b < 0.4) {
    return {
      vibe: "Light",
      feel: "Low end could carry more weight — kick and bass may need more body for translation.",
      technical: pct(b),
    }
  }
  if (b > 0.55) {
    return {
      vibe: "Heavy",
      feel: "The bottom end runs strong — tightening subs can improve clarity on smaller speakers.",
      technical: pct(b),
    }
  }
  return {
    vibe: "Balanced",
    feel: "Low end feels controlled and supportive — solid anchor for the rest of the mix.",
    technical: pct(b),
  }
}

export function brightnessPresentation(brightness: unknown): MixMetricPresentation {
  const b = typeof brightness === "number" ? brightness : 0
  if (b < 0.28) {
    return {
      vibe: "Warm",
      feel: "The top end is understated — a little air and presence can add clarity without harshness.",
      technical: pct(b),
    }
  }
  if (b < 0.48) {
    return {
      vibe: "Clear",
      feel: "Highs feel natural and musical — brightness sits in a comfortable zone.",
      technical: pct(b),
    }
  }
  return {
    vibe: "Bright",
    feel: "The mix leans luminous and open — watch for fatigue on bright systems.",
    technical: pct(b),
  }
}

export function energyPresentation(energy: unknown): MixMetricPresentation {
  if (typeof energy === "string") {
    const e = energy.toLowerCase()
    if (e === "low") {
      return {
        vibe: "Gentle",
        feel: "Overall energy is relaxed — consider lifting drums and transients for more drive.",
        technical: "Low energy",
      }
    }
    if (e === "high") {
      return {
        vibe: "Punchy",
        feel: "The track pushes forward with conviction — great for impact-led genres.",
        technical: "High energy",
      }
    }
    return {
      vibe: "Steady",
      feel: "Energy feels even and controlled across the arrangement.",
      technical: "Medium energy",
    }
  }
  if (typeof energy === "number") {
    return {
      vibe: energy > 0.6 ? "Aggressive" : energy > 0.35 ? "Driven" : "Atmospheric",
      feel: "Overall movement and intensity across the arrangement.",
      technical: energy.toFixed(2),
    }
  }
  return { vibe: "—", feel: "Energy profile unavailable", technical: "—" }
}

export function clarityPresentation(result: Record<string, unknown> | null | undefined): MixMetricPresentation {
  const b = typeof result?.brightness === "number" ? result.brightness : 0
  const s = typeof result?.stereoWidth === "number" ? result.stereoWidth : 0
  const blend = b * 0.55 + s * 0.45
  if (blend < 0.22) {
    return {
      vibe: "Soft",
      feel: "Definition and air could come forward — vocals and tops may need more focus.",
      technical: "Clarity low",
    }
  }
  if (blend < 0.42) {
    return {
      vibe: "Clear",
      feel: "Important elements cut through without feeling harsh.",
      technical: "Clarity medium",
    }
  }
  return {
    vibe: "Present",
    feel: "The mix reads with confidence and detail on headphones and speakers.",
    technical: "Clarity high",
  }
}

export function highsPresentation(brightness: number): MixMetricPresentation {
  if (brightness < 0.28) {
    return {
      vibe: "Smooth",
      feel: "Top end is velvety — a touch of shelf or saturation can add sheen.",
      technical: pct(brightness),
    }
  }
  if (brightness < 0.48) {
    return {
      vibe: "Balanced",
      feel: "Highs sit comfortably against the mids — easy to master transparently.",
      technical: pct(brightness),
    }
  }
  return {
    vibe: "Airy",
    feel: "Treble content feels open and forward — great for sparkle, watch sibilance.",
    technical: pct(brightness),
  }
}

export type HeroInsight = { text: string }

export function heroInsightBullets(result: Record<string, unknown> | null | undefined): HeroInsight[] {
  if (!result) return []
  const bullets: HeroInsight[] = []
  const stereo = typeof result.stereoWidth === "number" ? result.stereoWidth : 0
  const dr = typeof result.dynamicRange === "number" ? result.dynamicRange : 0
  const lufs = typeof result.lufs === "number" ? result.lufs : null

  if (stereo < 0.25) {
    bullets.push({
      text: "The stereo image could feel wider and more immersive on headphones and speakers.",
    })
  } else {
    bullets.push({ text: "Stereo width feels open enough for a modern, release-ready master." })
  }

  if (dr > 14) {
    bullets.push({
      text: "Dynamics have room to breathe — light bus glue can make the drop hit harder.",
    })
  } else {
    bullets.push({ text: "Dynamic movement feels musical and under control." })
  }

  if (lufs != null) {
    bullets.push({
      text:
        lufs < -12
          ? "Overall level is conservative — mastering can lift loudness while keeping punch."
          : `Integrated loudness sits around ${lufs.toFixed(1)} LUFS — a solid starting point for mastering.`,
    })
  }

  return bullets.slice(0, 3)
}

export type IssuePresentation = {
  title: string
  insight: string
  tip?: string
}

const ISSUE_COPY: Record<
  string,
  { title: string; insight: (result: Record<string, unknown>) => string }
> = {
  "Low output level": {
    title: "Level sits below release targets",
    insight: (r) =>
      typeof r.lufs === "number"
        ? `The mix reads around ${(r.lufs as number).toFixed(1)} LUFS — a gentle lift before limiting can feel more competitive.`
        : "Overall level feels quieter than typical streaming releases.",
  },
  "Too much dynamic range": {
    title: "Dynamics could feel more glued",
    insight: (r) =>
      typeof r.dynamicRange === "number"
        ? `With ${(r.dynamicRange as number).toFixed(1)} dB of range, light bus compression can tighten the feel without losing emotion.`
        : "Volume swings are wide — a touch of glue can help the mix translate on small speakers.",
  },
  "Stereo too narrow": {
    title: "Stereo image feels tight",
    insight: (r) =>
      typeof r.stereoWidth === "number"
        ? `Your mix feels slightly narrow compared to modern releases — try widening pads and FX, not the kick or bass.`
        : "The stereo field could feel wider and more immersive.",
  },
  "Weak low-end": {
    title: "Low end could hit harder",
    insight: (r) =>
      typeof r.bassWeight === "number"
        ? `Sub energy is around ${pct(r.bassWeight as number)} — reinforcing kick and bass can improve club and phone playback.`
        : "The foundation could carry more weight for a fuller, controlled low end.",
  },
  "Lacks brightness": {
    title: "Top end could use more air",
    insight: (r) =>
      typeof r.brightness === "number"
        ? `High-frequency energy is around ${pct(r.brightness as number)} — gentle shelf or saturation can add clarity without harshness.`
        : "A little more presence in the highs can help vocals and leads shine.",
  },
}

export function presentIssue(
  issue: { text?: string; insight?: string; level?: string },
  result: Record<string, unknown> | null | undefined,
  fixTip?: string
): IssuePresentation {
  const key = issue.text ?? ""
  const mapped = ISSUE_COPY[key]
  const title = (mapped?.title ?? key) || "Mix note"
  const insight = mapped?.insight(result ?? {}) ?? issue.insight ?? ""
  return {
    title,
    insight,
    tip: fixTip,
  }
}

export function readinessHeadline(mixQuality: unknown): string {
  const q = typeof mixQuality === "number" ? Math.round(mixQuality) : 0
  if (q >= 85) return "Your mix is in strong shape for release"
  if (q >= 70) return "Your mix is close — a few tweaks can unlock more impact"
  if (q >= 50) return "Your mix has solid ideas — refinement will help it translate"
  return "Your mix needs attention before a final master shines"
}

export function readinessSubcopy(
  mixQuality: unknown,
  verdict?: string | null
): string {
  if (verdict && verdict.trim().length > 0) return verdict
  const q = typeof mixQuality === "number" ? mixQuality : 0
  if (q >= 75) return "Tone, dynamics, and balance are lining up well for mastering."
  return "Focus on width, level, and clarity — small moves can raise release readiness."
}

/** Keep fix steps musical when shown in UI — titles only change in generateFixes callers via presentIssue */
export function presentFixTitle(title: string): string {
  return ISSUE_COPY[title]?.title ?? title
}

export { num as formatAnalyzeTechnical }
