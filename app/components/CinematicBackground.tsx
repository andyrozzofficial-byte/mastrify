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
      <div className="cinematic-bg-cyan absolute inset-0" aria-hidden />
      <div className="cinematic-bg-blue absolute inset-0" aria-hidden />
      {!gradientOnly ? (
        <>
          <div
            className={`absolute left-1/2 top-[-200px] h-[520px] w-[min(900px,150vw)] -translate-x-1/2 rounded-full bg-purple-500/[0.055] blur-[72px] max-lg:blur-[48px]`}
            aria-hidden
          />
          <div
            className={`absolute bottom-[-240px] left-1/2 h-[560px] w-[min(780px,145vw)] -translate-x-1/2 rounded-full bg-cyan-500/[0.035] blur-[80px] max-lg:blur-[52px]`}
            aria-hidden
          />
        </>
      ) : null}
      <div className="cinematic-bg-vignette absolute inset-0" aria-hidden />
      {!marketingLite ? (
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_4px)]" />
      ) : (
        <div className="absolute inset-0 opacity-[0.02] max-lg:hidden bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.45)_0px,rgba(255,255,255,0.45)_1px,transparent_1px,transparent_4px)]" />
      )}
    </div>
  )
}
