export type MasterStylePresetId = "STREAM" | "CLUB" | "LOUD" | "WARM" | "FESTIVAL"

/** User-facing style names stored with beta feedback analytics. */
export const MASTER_STYLE_DISPLAY_LABELS: Record<MasterStylePresetId, string> = {
  STREAM: "Balanced",
  WARM: "Warm",
  LOUD: "Punchy",
  CLUB: "Club",
  FESTIVAL: "Open",
}

export function masteringStyleLabel(preset: string): string {
  return MASTER_STYLE_DISPLAY_LABELS[preset as MasterStylePresetId] ?? preset
}
