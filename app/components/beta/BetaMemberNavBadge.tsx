"use client"

type Props = {
  label: string
  compact?: boolean
  className?: string
}

export default function BetaMemberNavBadge({ label, compact = false, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/[0.14] font-semibold text-violet-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_14px_rgba(139,92,246,0.14)] ${
        compact
          ? "min-h-[32px] px-2.5 py-1 text-[10px] tracking-wide sm:px-3 sm:text-[11px]"
          : "min-h-[34px] px-3.5 py-1.5 text-[11px] tracking-wide sm:text-[12px]"
      } ${className}`}
      title="Private beta member"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.9)]" aria-hidden />
      {label}
    </span>
  )
}
