"use client"

import { useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import CinematicBackground from "../components/CinematicBackground"
import { useMasterSession } from "./MasterSessionProvider"

const STEPS = [
  { n: 1, label: "Upload" },
  { n: 2, label: "Settings" },
  { n: 3, label: "Master" },
] as const

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { file, setFile } = useMasterSession()

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] text-white md:min-h-[calc(100vh-4rem)]">
      <CinematicBackground intensity="strong" />
      <div className="relative mx-auto flex w-full max-w-[min(100%,28rem)] flex-col items-center px-5 pb-28 pt-12 sm:max-w-xl md:px-6 md:pb-32 md:pt-16 lg:max-w-[30rem]">
        {/* Badge */}
        <span className="rounded-full border border-purple-500/20 bg-purple-500/[0.06] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-purple-200/90 shadow-[0_0_18px_rgba(124,58,237,0.12)]">
          AI mastering
        </span>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mt-7 text-center text-[1.65rem] font-bold leading-[1.12] tracking-[-0.02em] text-white sm:text-[1.85rem] md:mt-8 md:text-[2rem]"
        >
          Master{" "}
          <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            your track
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
          className="mt-4 max-w-[22rem] text-center text-[13px] leading-relaxed text-white/48 md:mt-5 md:max-w-md md:text-[14px] md:leading-relaxed"
        >
          Upload your mix and let AI create a professional master ready for release.
        </motion.p>

        {/* Step indicator */}
        <nav className="relative mt-10 w-full max-w-[17.5rem] sm:max-w-xs md:mt-12" aria-label="Progress">
          <div
            className="pointer-events-none absolute left-[14%] right-[14%] top-[0.65rem] z-0 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
            aria-hidden
          />
          <ol className="relative z-10 flex justify-between">
            {STEPS.map((step) => {
              const active = step.n === 1
              return (
              <li key={step.n} className="flex flex-col items-center" style={{ width: "33.33%" }}>
                <div
                  className={`flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums transition-colors duration-300 md:h-7 md:w-7 md:text-[11px] ${
                    active
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_0_14px_rgba(139,92,246,0.31),0_0_6px_rgba(99,102,241,0.12)] ring-1 ring-white/15"
                      : "border border-white/[0.12] bg-black/50 text-white/38 ring-0"
                  }`}
                >
                  {step.n}
                </div>
                <span
                  className={`mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.2em] md:text-[10px] md:tracking-[0.22em] ${
                    active ? "text-white/92" : "text-white/32"
                  }`}
                >
                  {step.label}
                </span>
              </li>
              )
            })}
          </ol>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: "easeOut" }}
          className="mt-10 w-full md:mt-12"
        >
          <div
            className="group relative mx-auto w-full max-w-md cursor-pointer overflow-hidden rounded-2xl border border-white/[0.085] bg-gradient-to-b from-white/[0.055] to-black/[0.52] p-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.085),0_28px_78px_rgba(0,0,0,0.51),0_0_0_1px_rgba(139,92,246,0.05)] backdrop-blur-2xl transition-all duration-300 ease-out hover:border-purple-400/16 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.095),0_30px_84px_rgba(0,0,0,0.54),0_0_28px_rgba(88,28,135,0.11)] md:rounded-3xl md:p-11"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) setFile(f)
            }}
            onClick={() => inputRef.current?.click()}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/[0.085] via-transparent to-cyan-500/[0.055] opacity-0 transition-opacity duration-300 group-hover:opacity-[0.85] md:rounded-3xl" />
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
            />
            <div className="relative flex flex-col items-center gap-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/28 to-cyan-500/18 ring-1 ring-white/[0.085] md:h-16 md:w-16">
                <svg className="h-7 w-7 text-white/90 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold tracking-tight text-white md:text-lg">Drop your track here</p>
                <p className="text-[12px] leading-snug text-white/42 md:text-[13px]">
                  WAV, AIFF, FLAC, MP3 up to 500MB
                </p>
              </div>
              <span className="rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 px-7 py-2.5 text-sm font-semibold text-white shadow-[0_8px_26px_rgba(139,92,246,0.19),0_3px_12px_rgba(0,0,0,0.3)] transition duration-300 group-hover:brightness-[1.06] md:px-8">
                Choose file
              </span>
              <p className="text-[11px] text-white/32">or drag and drop</p>
            </div>
          </div>

          {file && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 truncate text-center text-[11px] text-cyan-300/75 md:mt-5"
            >
              {file.name}
            </motion.p>
          )}

          {/* Feature row — compact, clearer hierarchy */}
          <ul className="mt-9 grid gap-6 text-center sm:mt-10 sm:grid-cols-3 sm:gap-5 sm:text-left">
            <li className="flex flex-col items-center gap-2 sm:items-start">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-purple-300/80">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[12px] font-semibold leading-tight text-white/90 md:text-[13px]">AI mastering</p>
                <p className="text-[11px] leading-snug text-white/38 md:text-[12px] md:leading-snug">Industry-standard quality</p>
              </div>
            </li>
            <li className="flex flex-col items-center gap-2 sm:items-start">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-purple-300/80">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[12px] font-semibold leading-tight text-white/90 md:text-[13px]">Multiple styles</p>
                <p className="text-[11px] leading-snug text-white/38 md:text-[12px] md:leading-snug">Choose your vibe</p>
              </div>
            </li>
            <li className="flex flex-col items-center gap-2 sm:items-start">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-purple-300/80">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[12px] font-semibold leading-tight text-white/90 md:text-[13px]">Secure & private</p>
                <p className="text-[11px] leading-snug text-white/38 md:text-[12px] md:leading-snug">Your files are safe</p>
              </div>
            </li>
          </ul>

          {/* Premium note — lighter, less boxed */}
          <div className="mt-9 flex flex-col items-stretch gap-3 border-t border-white/[0.05] pt-8 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-9">
            <p className="text-center text-[12px] leading-snug text-white/42 sm:flex-1 sm:text-left md:text-[13px] md:leading-relaxed">
              <span className="font-medium text-white/78">AI mastering is a premium feature.</span>{" "}
              <span className="text-white/40">Get unlimited masters, stereo depth, and more.</span>
            </p>
            <Link
              href="/pricing"
              className="shrink-0 self-center rounded-md border border-purple-400/22 px-2.5 py-1 text-[11px] font-medium text-purple-200/90 transition hover:border-purple-400/35 hover:bg-white/[0.03] hover:text-white sm:self-auto sm:px-3 sm:py-1 sm:text-xs"
            >
              See pricing
            </Link>
          </div>

          <div className="mt-8 flex flex-col gap-2.5 sm:mt-9">
            <button
              type="button"
              disabled={!file}
              onClick={() => router.push("/master/settings")}
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 md:py-4"
            >
              Continue to settings
            </button>
            <p className="text-center text-[10px] leading-relaxed text-white/30 md:text-[11px]">
              Prefer the classic flow?{" "}
              <Link href="/flow" className="text-purple-300/85 underline-offset-2 transition hover:text-purple-200 hover:underline">
                Use one-page master
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
