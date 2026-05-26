"use client"

import type { BetaMasteringUiState } from "../../../lib/betaPoints"
import BetaResultRewardStrip from "./BetaResultRewardStrip"

type Props = {
  betaUi: BetaMasteringUiState
  className?: string
}

/** @deprecated Floating widget removed — use BetaResultRewardStrip inside BetaMasterStatusCard on the result page. */
export default function BetaResultRewardWidget({ betaUi, className = "" }: Props) {
  return <BetaResultRewardStrip betaUi={betaUi} className={className} />
}
