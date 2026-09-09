"use client"

export default function CinematicBackground({ intensity = "default" }: { intensity?: "default" | "subtle" | "strong" }) {
  const op = intensity === "subtle" ? 0.06 : intensity === "strong" ? 0.11 : 0.085
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, ${op}), transparent 55%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 55% 38% at 12% 88%, rgba(99, 102, 241, ${op * 0.35}), transparent 45%)`,
        }}
      />
      <div className="absolute left-1/2 top-[-200px] h-[480px] w-[min(820px,140vw)] -translate-x-1/2 rounded-full bg-purple-500/[0.03] blur-[72px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_4px)]" />
    </div>
  )
}
