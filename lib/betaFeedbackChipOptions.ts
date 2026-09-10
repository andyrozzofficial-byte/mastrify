/** Post-master result feedback — multi-select chips (stored in responses + legacy text fields). */

export const BETA_LIKED_FEATURE_OPTIONS = [
  "Punch",
  "Loudness",
  "Clarity",
  "Stereo width",
  "Low-end",
  "Dynamics",
  "Warmth",
  "Balance",
] as const

export const BETA_IMPROVEMENT_OPTIONS = [
  "Too bright",
  "Too dark",
  "Too compressed",
  "Too quiet",
  "Too loud",
  "More width",
  "Stronger low-end",
  "Cleaner vocals",
  "Better punch",
] as const

export type BetaLikedFeature = (typeof BETA_LIKED_FEATURE_OPTIONS)[number]
export type BetaImprovementChip = (typeof BETA_IMPROVEMENT_OPTIONS)[number]

export function toggleChipSelection(current: string[], chip: string): string[] {
  return current.includes(chip) ? current.filter((c) => c !== chip) : [...current, chip]
}

export function formatChipSelections(items: string[]): string {
  return items.join(", ")
}

/** Map result-page chips → legacy survey stoodOut tags for analytics. */
const LIKED_CHIP_TO_STOOD_OUT: Record<string, string> = {
  Punch: "Loudness / punch",
  Loudness: "Loudness / punch",
  Clarity: "Clarity",
  "Stereo width": "Stereo width",
  "Low-end": "Bass response",
  Dynamics: "Preserved the vibe of the mix",
  Warmth: "Frequency balance",
  Balance: "Frequency balance",
}

/** Map improvement chips → legacy soundedOff tags. */
const IMPROVEMENT_CHIP_TO_SOUNDED_OFF: Record<string, string> = {
  "Too bright": "Harsh highs",
  "Too dark": "Too flat / lifeless",
  "Too compressed": "Too compressed",
  "Too quiet": "Too flat / lifeless",
  "Too loud": "Too compressed",
  "More width": "Other",
  "Stronger low-end": "Too much bass",
  "Cleaner vocals": "Clarity",
  "Better punch": "Too flat / lifeless",
}

export function stoodOutTagsFromLikedChips(chips: string[]): string[] {
  const set = new Set<string>()
  for (const chip of chips) {
    const mapped = LIKED_CHIP_TO_STOOD_OUT[chip]
    if (mapped) set.add(mapped)
  }
  if (chips.length > 0 && set.size === 0) set.add("Other")
  return [...set]
}

export function soundedOffTagsFromImprovementChips(chips: string[]): string[] {
  const set = new Set<string>()
  for (const chip of chips) {
    const mapped = IMPROVEMENT_CHIP_TO_SOUNDED_OFF[chip]
    if (mapped) set.add(mapped)
  }
  if (chips.length > 0 && set.size === 0) set.add("Other")
  return [...set]
}
