"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useId, useState, type RefObject } from "react"
import CinematicUploadCardShell from "../cinematic/CinematicUploadCardShell"
import {
  AUDIO_UPLOAD_ACCEPT,
  AUDIO_UPLOAD_REJECT_MESSAGE,
  isAcceptedAudioUpload,
} from "../../../lib/audioUploadAccept"
import {
  IOS_SAFE_FILE_INPUT_CLASS,
  LOADED_FILE_INPUT_CLASS,
  bindIosFileInputHandlers,
} from "../../../lib/iosFileInput"

export type UploadCardMode = "analyze" | "master"

const COPY: Record<
  UploadCardMode,
  {
    dropIdle: string
    dropDrag: string
    dropLoaded: string
    primaryAction: string
  }
> = {
  analyze: {
    dropIdle: "Drop your track here",
    dropDrag: "Release to analyze",
    dropLoaded: "Track ready to scan",
    primaryAction: "Scan my track",
  },
  master: {
    dropIdle: "Drop your mix",
    dropDrag: "Release your mix",
    dropLoaded: "Mix ready to master",
    primaryAction: "Continue to settings",
  },
}

type Props = {
  mode: UploadCardMode
  file: File | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelected: (file: File) => void
  onPrimaryAction: () => void
  primaryActionLoading?: boolean
  primaryActionDisabled?: boolean
}

/** Shared upload card — Analyze styling is the source of truth for both flows. */
export default function UploadCard({
  mode,
  file,
  fileInputRef,
  onFileSelected,
  onPrimaryAction,
  primaryActionLoading = false,
  primaryActionDisabled = false,
}: Props) {
  const reduce = useReducedMotion()
  const fileInputId = useId()
  const [dragging, setDragging] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const loaded = Boolean(file)
  const copy = COPY[mode]

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

  const fileInputHandlers = bindIosFileInputHandlers((candidate, input) =>
    handlePickedFile(candidate, input),
  )

  const dropTitle = dragging ? copy.dropDrag : loaded ? copy.dropLoaded : copy.dropIdle

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
      <motion.div
        className={`marketing-upload-dropzone ${loaded ? "is-loaded" : ""} ${dragging ? "is-dragging" : ""}`.trim()}
      >
        <motion.div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08] sm:mb-4 sm:h-12 sm:w-12"
          animate={reduce ? undefined : { y: [0, -3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg className="h-7 w-7 text-violet-200/70 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.4}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </motion.div>
        <p className="text-[1.05rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.05rem]">{dropTitle}</p>
        <p className="mx-auto mt-1.5 text-[12px] font-medium tracking-wide text-white/58 sm:mt-2">
          WAV · AIFF · FLAC · MP3
        </p>
        <p className="mx-auto mt-1 hidden max-w-[18rem] text-[12px] leading-relaxed text-white/50 sm:block">
          Up to 500MB — drag and drop supported
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
        aria-hidden={loaded}
        className={loaded ? LOADED_FILE_INPUT_CLASS : IOS_SAFE_FILE_INPUT_CLASS}
        accept={AUDIO_UPLOAD_ACCEPT}
        {...fileInputHandlers}
      />

      <div className="marketing-upload-actions relative z-30">
        {file ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (primaryActionDisabled || primaryActionLoading) return
              onPrimaryAction()
            }}
            disabled={primaryActionDisabled || primaryActionLoading}
            className="marketing-upload-btn-primary relative z-30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {primaryActionLoading ? "Opening settings…" : copy.primaryAction}
          </button>
        ) : (
          <label
            htmlFor={fileInputId}
            className="marketing-upload-btn-primary relative z-30 cursor-pointer"
          >
            Choose file
          </label>
        )}

        {file ? (
          <label
            htmlFor={fileInputId}
            className="marketing-upload-btn-secondary relative z-30 cursor-pointer"
          >
            Choose a different file
          </label>
        ) : (
          <p className="hidden text-center text-[11px] text-white/58 sm:block">or drag and drop</p>
        )}

        {pickError ? (
          <p className="text-center text-[12px] leading-relaxed text-rose-300/88" role="alert">
            {pickError}
          </p>
        ) : null}

        {mode === "master" ? (
          <>
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
          </>
        ) : null}
      </div>
    </CinematicUploadCardShell>
  )
}
