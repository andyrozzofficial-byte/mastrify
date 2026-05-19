"use client"

import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useId, useState, type RefObject } from "react"
import CinematicUploadCardShell from "../cinematic/CinematicUploadCardShell"
import {
  AUDIO_UPLOAD_ACCEPT,
  AUDIO_UPLOAD_REJECT_MESSAGE,
  isAcceptedAudioUpload,
} from "../../../lib/audioUploadAccept"
import { OFF_SCREEN_FILE_INPUT_CLASS, bindIosFileInputHandlers } from "../../../lib/iosFileInput"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  file: File | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelected: (file: File) => void
  onContinue: () => void
}

export default function MasterUploadCard({
  file,
  fileInputRef,
  onFileSelected,
  onContinue,
}: Props) {
  const reduce = useReducedMotion()
  const fileInputId = useId()
  const [dragging, setDragging] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const loaded = Boolean(file)

  const fileInputHandlers = bindIosFileInputHandlers((candidate, input) =>
    handlePickedFile(candidate, input)
  )

  function handlePickedFile(candidate: File | undefined, input?: HTMLInputElement | null) {
    if (!candidate) return
    if (!isAcceptedAudioUpload(candidate)) {
      setPickError(AUDIO_UPLOAD_REJECT_MESSAGE)
      if (input) input.value = ""
      return
    }
    setPickError(null)
    onFileSelected(candidate)
    if (input) input.value = ""
  }

  return (
    <CinematicUploadCardShell
      dragging={dragging}
      loaded={loaded}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handlePickedFile(e.dataTransfer.files[0])
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={loaded ? "loaded" : dragging ? "drag" : "idle"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: EASE }}
          className={`relative min-w-0 overflow-hidden rounded-xl border border-dashed px-3.5 text-center transition-colors duration-300 sm:px-6 ${
            loaded ? "border-emerald-400/25 bg-emerald-950/[0.08] py-5 sm:py-7" : "border-white/[0.1] bg-black/[0.35] py-6 sm:py-8"
          }`}
        >
          {loaded ? (
            <>
              <motion.span
                className="mx-auto mb-2.5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/75"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                Mix loaded
              </motion.span>
              <p className="text-[1rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.05rem]">Mix received</p>
              <p className="mx-auto mt-1.5 max-w-[20rem] text-[12px] leading-relaxed text-white/64">
                Continue below to choose your master settings.
              </p>
              <p className="mx-auto mt-2 max-w-full truncate px-1 text-[12px] text-white/68">{file?.name}</p>
            </>
          ) : (
            <>
              <motion.div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08]"
                animate={reduce ? undefined : { y: [0, -3, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg className="h-6 w-6 text-violet-200/70" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.4}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </motion.div>
              <p className="text-[1rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.05rem]">
                {dragging ? "Release your mix" : "Drop your mix here"}
              </p>
              <p className="mx-auto mt-2 max-w-[18rem] text-[12px] leading-relaxed text-white/64">
                WAV, AIFF, FLAC, MP3 — up to 500MB
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <input
        id={fileInputId}
        type="file"
        ref={fileInputRef}
        tabIndex={-1}
        className={OFF_SCREEN_FILE_INPUT_CLASS}
        accept={AUDIO_UPLOAD_ACCEPT}
        {...fileInputHandlers}
      />

      <div className="relative z-[2] mt-4 flex flex-col items-stretch gap-2 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          disabled={!loaded}
          onClick={onContinue}
          className="group relative z-[3] flex min-h-[46px] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-6 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.1] transition hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span
            className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%] group-disabled:translate-x-[-120%]"
            aria-hidden
          />
          <span className="relative z-[1]">Continue to settings</span>
        </button>

        <label
          htmlFor={fileInputId}
          className="group relative flex min-h-[46px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[13px] font-semibold text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/[0.04] transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
        >
          <span
            className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
            aria-hidden
          />
          <span className="relative z-[1]">{loaded ? "Choose a different file" : "Choose file"}</span>
        </label>

        {!loaded ? <p className="text-center text-[11px] text-white/58">or drag and drop</p> : null}

        {pickError ? (
          <p className="text-center text-[12px] leading-relaxed text-rose-300/88" role="alert">
            {pickError}
          </p>
        ) : null}

        <Link
          href="/analyze"
          className="flex min-h-[40px] items-center justify-center rounded-xl text-[12px] font-medium text-white/50 transition hover:bg-white/[0.03] hover:text-white/75"
        >
          Analyze mix first
        </Link>

        <p className="pt-0.5 text-center text-[11px] leading-snug text-muted sm:text-[12px]">
          Pay only for masters you export
          <span className="text-muted-soft"> · </span>
          Typically 30–60 seconds per render
        </p>
      </div>
    </CinematicUploadCardShell>
  )
}
