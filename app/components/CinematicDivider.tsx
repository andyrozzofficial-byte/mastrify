type Props = {
  className?: string
  /** No animated opacity loops — for scroll-safe pages */
  static?: boolean
}

export default function CinematicDivider({ className = "", static: isStatic = false }: Props) {
  return (
    <div className={`relative h-px w-full ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent opacity-60" />
      <div className="absolute left-1/2 top-1/2 h-[2px] w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-violet-400/45 to-transparent opacity-40" />
    </div>
  )
}
