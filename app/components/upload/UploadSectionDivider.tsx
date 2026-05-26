/** Subtle label between beta status and upload on the master hero. */
export default function UploadSectionDivider() {
  return (
    <div className="mb-6 flex items-center gap-3.5 sm:mb-6" role="separator" aria-label="Upload your mix">
      <div
        className="h-px min-w-0 flex-1 bg-gradient-to-r from-transparent via-white/[0.05] to-white/[0.08]"
        aria-hidden
      />
      <span className="shrink-0 px-1 text-[10px] font-medium tracking-[0.18em] text-white/28">Upload your mix</span>
      <div
        className="h-px min-w-0 flex-1 bg-gradient-to-l from-transparent via-white/[0.05] to-white/[0.08]"
        aria-hidden
      />
    </div>
  )
}
