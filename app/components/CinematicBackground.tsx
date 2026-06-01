"use client"

export default function CinematicBackground({
  intensity = "default",
  marketingLite = false,
  gradientOnly = false,
}: {
  intensity?: "default" | "subtle" | "strong"
  /** Softer fixed background on marketing routes */
  marketingLite?: boolean
  /** Skip large blurred orbs — gradients only (better scroll on mobile/Safari) */
  gradientOnly?: boolean
}) {
  const anchored = gradientOnly

  return (
    <div
      data-intensity={intensity}
      className={`cinematic-bg-root pointer-events-none inset-0 -z-10 ${
        anchored ? "absolute overflow-x-clip" : "fixed overflow-hidden"
      }`}
    >
      <div className="cinematic-bg-violet absolute inset-0" aria-hidden />
      <div className="cinematic-bg-vignette absolute inset-0" aria-hidden />
      {!marketingLite ? (
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_4px)]" />
      ) : (
        <div className="absolute inset-0 opacity-[0.02] max-lg:hidden bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.45)_0px,rgba(255,255,255,0.45)_1px,transparent_1px,transparent_4px)]" />
      )}
    </div>
  )
}
