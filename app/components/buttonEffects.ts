/** Shared button glow/shadow effects — restrained purple, no cyan glow. */

export const btnPrimaryVertical = {
  shadow:
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_14px_36px_rgba(0,0,0,0.30),0_0_14px_rgba(99,102,241,0.05)]",
  hover:
    "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_44px_rgba(0,0,0,0.34),0_0_18px_rgba(99,102,241,0.07)] hover:brightness-[1.03]",
  compactShadow:
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_12px_32px_rgba(0,0,0,0.27)]",
  compactHover: "hover:brightness-[1.03]",
  ring: "ring-1 ring-white/[0.1]",
  shine:
    "pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]",
} as const

export const btnPrimaryHorizontal = {
  shadow: "shadow-[0_0_10px_rgba(99,102,241,0.05),0_10px_28px_rgba(0,0,0,0.30)]",
  hover:
    "hover:shadow-[0_0_12px_rgba(99,102,241,0.06),0_12px_32px_rgba(0,0,0,0.34)] hover:brightness-[1.04]",
  heroShadow: "shadow-[0_0_14px_rgba(99,102,241,0.06),0_12px_32px_rgba(0,0,0,0.31)]",
  heroHover: "hover:brightness-[1.04]",
  ring: "ring-1 ring-white/[0.08]",
  compactGlow: "shadow-[0_0_12px_rgba(99,102,241,0.07)]",
  compactHover: "hover:brightness-[1.03]",
} as const

export const btnPrimaryIntense = {
  shadow: "shadow-[0_0_16px_rgba(99,102,241,0.10),0_12px_32px_rgba(0,0,0,0.30)]",
  hover:
    "hover:shadow-[0_0_20px_rgba(99,102,241,0.12),0_14px_36px_rgba(0,0,0,0.34)] hover:brightness-[1.03]",
  ring: "ring-1 ring-white/[0.14]",
  masterShadow:
    "shadow-[0_0_16px_rgba(99,102,241,0.12),0_14px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.09)]",
  masterHover: "hover:brightness-[1.07]",
} as const

export const btnSecondary = {
  shadow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_28px_rgba(0,0,0,0.22)]",
  hover: "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.26)]",
  ring: "ring-1 ring-white/[0.04]",
  insetOnly: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  cyanGlowHover:
    "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.26)]",
} as const
