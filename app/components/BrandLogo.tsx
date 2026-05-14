export default function BrandLogo({
  subtitle,
  className = "",
}: {
  subtitle?: string
  className?: string
}) {
  return (
    <div className={`text-center ${className}`}>
      <h2
        className="mb-2 text-4xl font-extrabold tracking-tight text-transparent md:text-5xl bg-gradient-to-r from-white via-purple-300 to-purple-500 bg-clip-text drop-shadow-[0_0_35px_rgba(139,92,246,0.8)]"
      >
        Mastrify
      </h2>
      {subtitle ? (
        <p className="mb-6 text-xs tracking-[0.35em] text-purple-400/90">{subtitle}</p>
      ) : null}
    </div>
  )
}
