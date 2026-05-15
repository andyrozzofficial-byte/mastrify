"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useState, type RefObject } from "react"
import HeroWaveBackdrop from "../HeroWaveBackdrop"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  file: File | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileInputChange: (file: File) => void
  onUploadClick: () => void
}

export default function AnalyzeUploadCard({
  file,
  fileInputRef,
  onFileInputChange,
  onUploadClick,
}: Props) {
  const reduce = useReducedMotion()
  const [dragging, setDragging] = useState(false)

  return (
    <motion.div
      className="relative w-full"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-500/15 opacity-60 blur-sm"
        animate={
          reduce
            ? undefined
            : {
                opacity: dragging ? 0.85 : [0.35, 0.55, 0.35],
              }
        }
        transition={{ duration: dragging ? 0.25 : 4, repeat: dragging ? 0 : Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <motion.div
        className={`relative overflow-hidden rounded-[1.3rem] border bg-gradient-to-b from-white/[0.045] to-black/[0.72] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_56px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-[border-color,box-shadow] duration-300 ${
          dragging
            ? "border-violet-400/30 shadow-[0_0_32px_rgba(139,92,246,0.12),0_28px_64px_rgba(0,0,0,0.5)]"
            : "border-white/[0.1] hover:border-white/[0.14] hover:shadow-[0_0_28px_rgba(99,102,241,0.08),0_28px_64px_rgba(0,0,0,0.48)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f?.type.startsWith("audio")) onFileInputChange(f)
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="audio/*,video/*"
          capture
          onChange={(e) => {
            const selected = e.target.files?.[0]
            if (selected) onFileInputChange(selected)
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] overflow-hidden opacity-[0.12]"
          aria-hidden
        >
          <HeroWaveBackdrop heightClass="h-full" className="opacity-100" />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-600/[0.08] blur-3xl"
          animate={reduce ? undefined : { opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />

        <motion.div className="relative p-6 sm:p-7 md:p-8">
          <div
            className={`relative overflow-hidden rounded-xl border border-dashed px-6 py-10 text-center transition-colors duration-300 sm:px-8 sm:py-12 ${
              dragging
                ? "border-violet-400/35 bg-violet-950/[0.12]"
                : "border-white/[0.1] bg-black/[0.35]"
            }`}
          >
            <motion.div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              animate={reduce ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg className="h-7 w-7 text-violet-200/70" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.4}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </motion.div>
            <p className="text-[1.05rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.12rem]">
              {dragging ? "Release to analyze" : "Drop your track here"}
            </p>
            <p className="mx-auto mt-2.5 max-w-[18rem] text-[12px] leading-relaxed text-white/32 sm:text-[13px]">
              WAV, AIFF, FLAC, MP3 — up to 500MB
            </p>
          </div>

          <motion.div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onUploadClick}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/95 via-indigo-600/95 to-indigo-800/95 px-8 py-3.5 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_36px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.1] transition hover:brightness-[1.04]"
            >
              <span
                className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
                aria-hidden
              />
              <span className="relative z-[1]">{file ? "Scan my track" : "Choose file"}</span>
            </button>
            <p className="text-[11px] text-white/26">or drag and drop</p>
            {file ? (
              <p className="max-w-full truncate px-2 text-xs text-cyan-200/55">{file.name}</p>
            ) : null}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
