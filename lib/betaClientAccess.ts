import type { BetaMasteringUiState } from "./betaPoints"

export type BetaAccessJson = {
  isBeta?: boolean
  isBetaUser?: boolean
  hasMasteringAccess?: boolean
  complete?: boolean
  profileExists?: boolean
  email?: string | null
  betaUi?: BetaMasteringUiState | null
}

export function accessFromBetaJson(json: BetaAccessJson | null | undefined): boolean {
  return Boolean(
    json?.isBeta ??
      json?.isBetaUser ??
      json?.hasMasteringAccess ??
      json?.complete ??
      json?.profileExists,
  )
}
