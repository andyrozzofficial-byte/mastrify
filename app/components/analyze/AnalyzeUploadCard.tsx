"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useId, useState, type RefObject } from "react"
import HeroWaveBackdrop from "../HeroWaveBackdrop"
import {
  AUDIO_UPLOAD_ACCEPT,
  AUDIO_UPLOAD_REJECT_MESSAGE,
  isAcceptedAudioUpload,
} from "../../../lib/audioUploadAccept"
import { IOS_SAFE_FILE_INPUT_CLASS, bindIosFileInputHandlers } from "../../../lib/iosFileInput"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  file: File | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileInputChange: (file: File) => void
  onScanClick: () => void
}

export default function AnalyzeUploadCard({
  file,
  fileInputRef,
  onFileInputChange,
  onScanClick,
}: Props) {
  const reduce = useReducedMotion()
  const fileInputId = useId()
  const [dragging, setDragging] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)

  function handlePickedFile(candidate: File | undefined, input?: HTMLInputElement | null) {
    if (!candidate) return
    if (!isAcceptedAudioUpload(candidate)) {
      setPickError(AUDIO_UPLOAD_REJECT_MESSAGE)
      if (input) input.value = ""
      return
    }
    setPickError(null)
    onFileInputChange(candidate)
    if (input) input.value = ""
  }

  const fileInputHandlers = bindIosFileInputHandlers((candidate, input) =>
    handlePickedFile(candidate, input)
  )

  return (
    <motion.div
      className="fluid-surface relative"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
    >
      <div
        className="product-upload-card-glow pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-500/15 blur-sm"
        aria-hidden
      />

      <motion.div
        layout
        className={`product-upload-card-panel fluid-surface relative overflow-hidden transition-[border-color,box-shadow] duration-300 ${
          dragging
            ? "border-violet-400/30 shadow-[0_0_28px_rgba(99,102,241,0.1),0_28px_64px_rgba(0,0,0,0.48)]"
            : "border-white/[0.1] hover:border-white/[0.14]"
        }`}
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
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
          animate={{ height: file ? "48%" : "38%", opacity: file ? 0.2 : 0.1 }}
          transition={{ duration: 0.55, ease: EASE }}
          aria-hidden
        >
          <HeroWaveBackdrop efficient heightClass="h-full" className="opacity-100" />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-600/[0.08] blur-2xl"
          aria-hidden
        />

        <motion.div className="relative flex min-w-0 flex-col p-3.5 sm:p-6">
          <motion.div
            className={`relative min-w-0 overflow-hidden rounded-xl border border-dashed px-3.5 text-center transition-colors duration-300 sm:px-6 ${
              dragging
                ? "border-violet-400/30 bg-violet-950/[0.1]"
                : file
                  ? "border-emerald-400/25 bg-emerald-950/[0.08] py-5 sm:py-7"
                  : "border-white/[0.1] bg-black/[0.35] py-6 sm:py-8"
            }`}
          >
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
              {dragging ? "Release to analyze" : file ? "Track ready to scan" : "Drop your track here"}
            </p>
            <p className="mx-auto mt-2 max-w-[18rem] text-[12px] leading-relaxed text-white/64">
              WAV, AIFF, FLAC, MP3 — up to 500MB
            </p>
            {file ? (
              <p className="mx-auto mt-2 max-w-full truncate px-1 text-[12px] text-cyan-200/60">{file.name}</p>
            ) : null}
          </motion.div>

          <input
            id={fileInputId}
            type="file"
            ref={fileInputRef}
            tabIndex={-1}
            className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-[0.01]"
            accept={AUDIO_UPLOAD_ACCEPT}
            {...fileInputHandlers}
          />

          <motion.div className="relative z-[2] mt-4 flex flex-col items-stretch gap-2 border-t border-white/[0.06] pt-4">
            {file ? (
              <button
                type="button"
                onClick={onScanClick}
                className="group relative flex min-h-[46px] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-6 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.1] transition hover:brightness-[1.04]"
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
                  aria-hidden
                />
                <span className="relative z-[1]">Scan my track</span>
              </button>
            ) : (
              <label
                htmlFor={fileInputId}
                className="group relative flex min-h-[46px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-6 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.1] transition hover:brightness-[1.04]"
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
                  aria-hidden
                />
                <span className="relative z-[1]">Choose file</span>
              </label>
            )}

            {file ? (
              <label
                htmlFor={fileInputId}
                className="group relative flex min-h-[46px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[13px] font-semibold text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/[0.04] transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
              >
                <span className="relative z-[1]">Choose a different file</span>
              </label>
            ) : (
              <p className="text-center text-[11px] text-white/58">or drag and drop</p>
            )}

            {pickError ? (
              <p className="text-center text-[12px] leading-relaxed text-rose-300/88" role="alert">
                {pickError}
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
