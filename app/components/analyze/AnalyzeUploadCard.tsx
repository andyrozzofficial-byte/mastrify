"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useId, useState, type RefObject } from "react"
import CinematicUploadCardShell from "../cinematic/CinematicUploadCardShell"
import {
  AUDIO_UPLOAD_ACCEPT,
  AUDIO_UPLOAD_REJECT_MESSAGE,
  isAcceptedAudioUpload,
} from "../../../lib/audioUploadAccept"
import { IOS_SAFE_FILE_INPUT_CLASS, bindIosFileInputHandlers } from "../../../lib/iosFileInput"

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
  const loaded = Boolean(file)

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
          {dragging ? "Release to analyze" : loaded ? "Track ready to scan" : "Drop your track here"}
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

      <div className="marketing-upload-actions">
        {file ? (
          <button type="button" onClick={onScanClick} className="marketing-upload-btn-primary">
            Scan my track
          </button>
        ) : (
          <label htmlFor={fileInputId} className="marketing-upload-btn-primary cursor-pointer">
            Choose file
          </label>
        )}

        {file ? (
          <label htmlFor={fileInputId} className="marketing-upload-btn-secondary cursor-pointer">
            Choose a different file
          </label>
        ) : (
          <p className="text-center text-[11px] text-white/58">or drag and drop</p>
        )}

        {pickError ? (
          <p className="text-center text-[12px] leading-relaxed text-rose-300/88" role="alert">
            {pickError}
          </p>
        ) : null}
      </div>
    </CinematicUploadCardShell>
  )
}
