"use client"

type Props = {
  className?: string
}

export default function CinematicDivider({ className = "" }: Props) {
  return (
    <div className={`relative h-px w-full ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-px w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
    </div>
  )
}
