/**
 * Site-wide button appearance — the cards' violet family on a flat CTA surface
 * (see buttonMastrifyPurple in cardEffects.ts). Surface only: every consumer
 * keeps its own dimensions, radius, padding and typography.
 *
 * Hover brightens the whole surface via a filter rather than swapping the
 * gradient, because background-image cannot be transitioned.
 */

import { buttonMastrifyPurple } from "./cardEffects"

export const btnMastrifySecondaryCore = `border border-violet-400/30 text-white ${buttonMastrifyPurple} transition duration-200 hover:border-violet-300/45 hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60`

/** All buttons share the one purple surface. */
export const btnMastrifyPrimaryCore = btnMastrifySecondaryCore

export const btnStablePrimary = `stable-interaction inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-8 py-3.5 text-[14px] font-semibold ${btnMastrifySecondaryCore}`

export const btnStableSecondary = `stable-interaction inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-xl px-6 py-3 text-[13px] font-semibold text-white/85 ${btnMastrifySecondaryCore}`

export const btnResultPrimary = `stable-interaction rounded-xl ${btnMastrifySecondaryCore}`

export const btnResultToggleActive = btnMastrifySecondaryCore

export const btnResultToggleInactive =
  "border border-white/20 bg-transparent text-white/70 transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-600/10"

export const btnResultPlay = `flex items-center justify-center rounded-full ${btnMastrifySecondaryCore}`
