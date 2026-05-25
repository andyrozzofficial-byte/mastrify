import { toFiniteNumber } from "./masterResultInsights"

/** Final integrated LUFS from post-master analysis (EBU when server provides it). */
export function extractMasterLufs(analysis: Record<string, unknown> | null | undefined): number | null {
  if (!analysis || typeof analysis !== "object") return null
  const measured = toFiniteNumber(analysis.lufs)
  if (measured == null) return null
  return Number(measured.toFixed(2))
}
