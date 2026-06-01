type Props = {
  className?: string
  /** No animated opacity loops — for scroll-safe pages */
  static?: boolean
}

export default function CinematicDivider({ className = "", static: isStatic = false }: Props) {
  return (
    <div className={`relative h-px w-full ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent opacity-50" />
    </div>
  )
}
