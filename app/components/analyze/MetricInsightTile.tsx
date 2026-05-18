type Props = {
  label: string
  vibe: string
  feel: string
  technical: string
  vibeClassName?: string
}

/** Feel-first metric cell for analyze results — technical value secondary */
export default function MetricInsightTile({ label, vibe, feel, technical, vibeClassName }: Props) {
  return (
    <div className="card-pad-mobile flex min-h-[7.25rem] flex-col justify-between rounded-xl border border-white/[0.07] bg-black/[0.38] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:min-h-[7.5rem] md:rounded-2xl md:px-4 md:py-4">
      <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/60">{label}</div>
      <div className="mt-2">
        <p
          className={`text-[1.15rem] font-semibold leading-tight tracking-tight text-white/94 sm:text-[1.2rem] ${vibeClassName ?? ""}`}
        >
          {vibe}
        </p>
        <p className="mt-1.5 text-[11px] font-medium leading-snug text-white/72 sm:text-[12px]">{feel}</p>
      </div>
      <p className="mt-2 text-[10px] font-medium tabular-nums tracking-wide text-white/45">{technical}</p>
    </div>
  )
}