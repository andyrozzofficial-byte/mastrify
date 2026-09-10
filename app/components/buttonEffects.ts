/** Shared button effects — depth shadows only, no colored glow. */

export const btnPrimaryVertical = {
  shadow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_12px_32px_rgba(0,0,0,0.28)]",
  hover: "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_14px_36px_rgba(0,0,0,0.32)] hover:brightness-[1.02]",
  compactShadow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_12px_32px_rgba(0,0,0,0.27)]",
  compactHover: "hover:brightness-[1.02]",
  ring: "ring-1 ring-white/[0.1]",
  shine:
    "pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]",
} as const

export const btnPrimaryHorizontal = {
  shadow: "shadow-[0_10px_28px_rgba(0,0,0,0.28)]",
  hover: "hover:shadow-[0_12px_32px_rgba(0,0,0,0.32)] hover:brightness-[1.02]",
  heroShadow: "shadow-[0_12px_32px_rgba(0,0,0,0.30)]",
  heroHover: "hover:brightness-[1.02]",
  ring: "ring-1 ring-white/[0.08]",
  compactGlow: "shadow-[0_10px_28px_rgba(0,0,0,0.28)]",
  compactHover: "hover:brightness-[1.02]",
} as const

export const btnPrimaryIntense = {
  shadow: "shadow-[0_12px_32px_rgba(0,0,0,0.30)]",
  hover: "hover:shadow-[0_14px_36px_rgba(0,0,0,0.34)] hover:brightness-[1.02]",
  ring: "ring-1 ring-white/[0.14]",
  masterShadow:
    "shadow-[0_14px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.09)]",
  masterHover: "hover:brightness-[1.04]",
} as const

export const btnSecondary = {
  shadow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_28px_rgba(0,0,0,0.22)]",
  hover: "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_28px_rgba(0,0,0,0.24)]",
  ring: "ring-1 ring-white/[0.04]",
  insetOnly: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  cyanGlowHover:
    "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_28px_rgba(0,0,0,0.24)]",
} as const

export const btnStablePrimary = `stable-interaction group relative inline-flex min-h-[48px] w-full items-center justify-center overflow-hidden rounded-xl px-8 py-3.5 text-[14px] font-semibold text-white transition-[box-shadow,filter,background-color] duration-300 bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 ${btnPrimaryVertical.shadow} ${btnPrimaryVertical.ring} ${btnPrimaryVertical.hover}`

export const btnStableSecondary = `stable-interaction group relative inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[13px] font-semibold text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04] transition-[background-color,color] duration-300 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white`

/** Master result page — violet/magenta primaries, depth shadows only (no colored glow). */
export const btnResultPrimary =
  "stable-interaction bg-gradient-to-b from-violet-500/90 via-violet-600/93 to-fuchsia-800/88 text-white ring-1 ring-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_28px_rgba(0,0,0,0.28)] transition-[box-shadow,filter,transform] duration-200 hover:brightness-[1.02] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"

export const btnResultToggleActive =
  "bg-gradient-to-b from-violet-500/76 via-violet-600/78 to-fuchsia-700/74 text-white ring-1 ring-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"

export const btnResultPlay =
  "bg-gradient-to-br from-violet-500/90 to-fuchsia-700/86 text-white ring-1 ring-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_16px_rgba(0,0,0,0.26)] transition-[box-shadow,filter,transform] duration-200 hover:brightness-[1.02] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_18px_rgba(0,0,0,0.30)] active:scale-[0.97]"
