"use client"

export default function CinematicBackground({ intensity = "default" }: { intensity?: "default" | "subtle" | "strong" }) {
  const op = intensity === "subtle" ? 0.1 : intensity === "strong" ? 0.2 : 0.16
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
          background: `radial-gradient(ellipse 70% 45% at 80% 100%, rgba(34, 211, 238, ${op * 0.35}), transparent 50%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 10% 90%, rgba(59, 130, 246, ${op * 0.45}), transparent 45%)`,
        }}
      />
      <div className="absolute top-[-200px] left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-500/[0.055] blur-[110px]" />
      <div className="absolute bottom-[-240px] left-1/2 h-[560px] w-[780px] -translate-x-1/2 rounded-full bg-cyan-500/[0.035] blur-[120px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_4px)]" />
    </div>
  )
}
