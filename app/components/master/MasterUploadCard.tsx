"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useState, type RefObject } from "react"
import CinematicWaveform from "../audio/CinematicWaveform"
import HeroWaveBackdrop from "../HeroWaveBackdrop"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  file: File | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelected: (file: File) => void
  onChooseClick: () => void
}

export default function MasterUploadCard({
  file,
  fileInputRef,
  onFileSelected,
  onChooseClick,
}: Props) {
  const reduce = useReducedMotion()
  const [dragging, setDragging] = useState(false)
  const loaded = Boolean(file)

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
                opacity: dragging || loaded ? 0.8 : [0.35, 0.55, 0.35],
              }
        }
        transition={{ duration: dragging || loaded ? 0.3 : 4, repeat: dragging || loaded ? 0 : Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <motion.div
        layout
        className={`relative overflow-hidden rounded-[1.3rem] border bg-gradient-to-b from-white/[0.045] to-black/[0.72] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_56px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-[border-color,box-shadow] duration-500 ${
          loaded
            ? "border-violet-400/22 shadow-[0_0_28px_rgba(99,102,241,0.1),0_28px_64px_rgba(0,0,0,0.48)]"
            : dragging
              ? "border-violet-400/30"
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
          const f = e.dataTransfer.files[0]
          if (f?.type.startsWith("audio")) onFileSelected(f)
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="audio/*"
          onChange={(e) => {
            const selected = e.target.files?.[0]
            if (selected) onFileSelected(selected)
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
          animate={{ height: loaded ? "52%" : "40%", opacity: loaded ? 0.22 : 0.1 }}
          transition={{ duration: 0.55, ease: EASE }}
          aria-hidden
        >
          <HeroWaveBackdrop heightClass="h-full" className="opacity-100" />
        </motion.div>

        <AnimatePresence>
          {loaded ? (
            <motion.div
              key="loaded-wave"
              className="pointer-events-none absolute inset-x-3 bottom-3 z-[1]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <CinematicWaveform
                mode="processing"
                audioSrc={file}
                activeStep={0}
                height={56}
                className="opacity-90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-600/[0.08] blur-3xl"
          animate={reduce ? undefined : { opacity: loaded ? [0.55, 0.75, 0.55] : [0.4, 0.65, 0.4] }}
          transition={{ duration: loaded ? 3 : 7, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />

        <div className="relative p-6 sm:p-7 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={loaded ? "loaded" : dragging ? "drag" : "idle"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`relative overflow-hidden rounded-xl border border-dashed px-6 text-center transition-colors duration-300 sm:px-8 ${
                loaded ? "border-emerald-400/25 bg-emerald-950/[0.08] py-8 sm:py-9" : "border-white/[0.1] bg-black/[0.35] py-10 sm:py-12"
              }`}
            >
              {loaded ? (
                <>
                  <motion.span
                    className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/75"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                    Mix loaded
                  </motion.span>
                  <p className="text-[1.05rem] font-semibold tracking-[-0.02em] text-white/92">Ready for mastering</p>
                  <p className="mx-auto mt-2 max-w-[18rem] truncate text-[12px] text-white/38 sm:text-[13px]">{file?.name}</p>
                </>
              ) : (
                <>
                  <motion.div
                    className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08]"
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
                    {dragging ? "Release your mix" : "Drop your mix here"}
                  </p>
                  <p className="mx-auto mt-2.5 max-w-[18rem] text-[12px] leading-relaxed text-white/32 sm:text-[13px]">
                    WAV, AIFF, FLAC, MP3 — up to 500MB
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="relative z-[2] mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onChooseClick}
              className="group relative w-full overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.04] px-8 py-3.5 text-[14px] font-semibold text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/[0.04] transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
            >
              <span
                className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]"
                aria-hidden
              />
              <span className="relative z-[1]">{loaded ? "Choose a different file" : "Choose file"}</span>
            </button>
            {!loaded ? <p className="text-[11px] text-white/26">or drag and drop</p> : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
