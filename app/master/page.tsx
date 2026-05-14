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

  const openFilePicker = () => inputRef.current?.click()

  return (
    <div className="relative min-h-screen text-white">
      <CinematicBackground intensity="strong" />
      <div className="relative mx-auto flex w-full max-w-[520px] flex-col items-center px-5 pb-16 pt-4 sm:px-5 md:max-w-[568px] md:pb-20 md:pt-5">
        {/* Ambient glow — aligned with analyze hero column */}
        <div
          className="pointer-events-none absolute left-1/2 top-[2%] z-0 h-[min(52vh,520px)] w-[min(92vw,30rem)] -translate-x-1/2 rounded-[3rem] bg-[radial-gradient(ellipse_58%_44%_at_50%_20%,rgba(109,40,217,0.055),rgba(217,70,239,0.018)_48%,transparent_68%)] blur-2xl"
          aria-hidden
        />

        <div className="relative z-10 flex w-full flex-col items-center">
          <span className="rounded-full border border-purple-500/40 bg-purple-500/[0.07] px-3.5 py-1 text-[9px] font-bold uppercase tracking-[0.26em] text-purple-200/95 shadow-[0_0_12px_rgba(139,92,246,0.12)]">
            AI mastering
          </span>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mt-4 w-full text-center text-[2rem] font-extrabold leading-[1.06] tracking-tight text-white sm:mt-5 sm:text-[2.15rem] md:text-[2.45rem]"
          >
            <span className="text-white">Master </span>
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              your track
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
            className="mt-3 w-full max-w-[28rem] text-center text-[13px] leading-snug text-white/32 sm:text-[14px] md:mt-3.5"
          >
            Upload your mix and let AI create a professional master ready for release.
          </motion.p>

          {/* Step indicator — same rail system as analyze */}
          <div className="mx-auto mt-8 flex w-full max-w-[min(100%,380px)] items-center justify-center md:mt-9 md:max-w-[400px]" role="group" aria-label="Progress">
            {STEPS.map((step, i) => {
              const active = i === 0
              return (
                <div key={step.n} className="contents">
                  {i > 0 ? (
                    <div
                      className="mx-0.5 h-[0.5px] min-w-[1.25rem] flex-1 max-w-[3.25rem] bg-gradient-to-r from-transparent via-white/14 to-transparent sm:mx-1 sm:max-w-[4rem]"
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex w-[4rem] shrink-0 flex-col items-center sm:w-[4.25rem]">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold leading-none sm:h-[2.125rem] sm:w-[2.125rem] sm:text-xs ${
                        active
                          ? "bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.32)] ring-1 ring-purple-400/40"
                          : "border border-white/[0.1] bg-black/55 text-white/30"
                      }`}
                    >
                      {step.n}
                    </span>
                    <span
                      className={`mt-1.5 text-center text-[8px] font-semibold uppercase tracking-[0.2em] sm:text-[9px] ${
                        active ? "text-purple-300/95" : "text-white/34"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 w-full md:mt-9">
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

            <div className="relative w-full overflow-visible pb-0">
              <div
                className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[min(320px,68vw)] w-[min(460px,92%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_42%_36%_at_50%_50%,rgba(147,51,234,0.14),rgba(192,38,211,0.045)_52%,transparent_64%)] blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[min(180px,48vw)] w-[min(340px,85%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(34,211,238,0.06),transparent_55%)] blur-3xl"
                aria-hidden
              />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.5, ease: "easeOut" }}
                className="relative z-10 mx-auto w-full max-w-[min(100%,29.5rem)] origin-top scale-[1.18] cursor-pointer overflow-hidden rounded-[1.45rem] border border-white/[0.18] bg-gradient-to-b from-black/[0.52] to-black/[0.94] p-8 shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_0_24px_rgba(88,28,135,0.12),0_0_56px_rgba(88,28,135,0.1),0_28px_64px_rgba(0,0,0,0.68)] ring-1 ring-fuchsia-500/12 backdrop-blur-2xl transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-white/[0.24] hover:shadow-[0_0_0_1px_rgba(192,132,252,0.18),0_0_32px_rgba(88,28,135,0.16),0_0_64px_rgba(34,211,238,0.06),0_32px_72px_rgba(0,0,0,0.72)] sm:p-9 md:scale-[1.22] md:p-10"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) setFile(f)
                }}
                onClick={openFilePicker}
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-purple-600/10 blur-2xl" />

                <div className="relative flex w-full flex-col items-center text-center">
                  <div className="mx-1 w-full rounded-[1.1rem] border border-dashed border-white/[0.11] bg-black/[0.64] px-8 py-12 sm:mx-1.5 sm:px-10 sm:py-14 md:px-11 md:py-16">
                    <div className="mx-auto mb-5 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/40 to-purple-900/25 ring-1 ring-white/[0.12] shadow-[0_0_12px_rgba(168,85,247,0.14)] md:mb-6">
                      <svg
                        className="h-10 w-10 drop-shadow-[0_0_4px_rgba(216,180,254,0.28)]"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <defs>
                          <linearGradient id="masterUploadIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#e9d5ff" />
                            <stop offset="50%" stopColor="#c4b5fd" />
                            <stop offset="100%" stopColor="#a5b4fc" />
                          </linearGradient>
                        </defs>
                        <path
                          fill="none"
                          stroke="url(#masterUploadIconGrad)"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <p className="text-[1.14rem] font-semibold tracking-tight text-white sm:text-[1.22rem] md:text-[1.3rem]">
                      Drop your track here
                    </p>
                    <p className="mx-auto mt-3.5 max-w-[19rem] text-[12px] leading-relaxed text-white/28 sm:text-[13px] md:mt-4">
                      WAV, AIFF, FLAC, MP3 up to 500MB
                    </p>
                  </div>

                  <div className="mt-7 flex w-full max-w-[min(100%,22rem)] flex-col items-center gap-3 sm:mt-8 md:mt-9">
                    <span
                      role="presentation"
                      className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4338ca] to-[#0e7490] px-8 py-3.5 text-[14px] font-semibold text-white shadow-[0_0_22px_rgba(91,33,182,0.28),0_0_14px_rgba(14,116,144,0.14),inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition duration-300 hover:brightness-110 sm:py-4 sm:text-[16px]"
                    >
                      Choose file
                    </span>
                    <p className="text-[11px] text-white/24">or drag and drop</p>
                    {file ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-full truncate px-2 text-[13px] text-cyan-300/85 md:text-sm"
                      >
                        {file.name}
                      </motion.p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Feature row — slightly tighter to card than analyze, still same grid rhythm */}
          <ul className="mx-auto mt-6 grid w-full max-w-[min(100%,26rem)] grid-cols-1 gap-3 text-center sm:mt-7 sm:grid-cols-3 sm:gap-3 md:max-w-[min(100%,28rem)] md:gap-3">
            <li className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-white/[0.06] bg-black/[0.5] px-2.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md sm:min-h-[4.75rem] sm:py-3">
              <span className="flex h-9 w-9 items-center justify-center text-purple-300/90">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </span>
              <p className="text-[11px] font-semibold leading-tight text-white/88 sm:text-xs">AI mastering</p>
              <p className="text-[10px] leading-snug text-white/36 sm:text-[11px]">Industry-standard quality</p>
            </li>
            <li className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-white/[0.06] bg-black/[0.5] px-2.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md sm:min-h-[4.75rem] sm:py-3">
              <span className="flex h-9 w-9 items-center justify-center text-cyan-300/85">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </span>
              <p className="text-[11px] font-semibold leading-tight text-white/88 sm:text-xs">Multiple styles</p>
              <p className="text-[10px] leading-snug text-white/36 sm:text-[11px]">Choose your vibe</p>
            </li>
            <li className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-white/[0.06] bg-black/[0.5] px-2.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md sm:min-h-[4.75rem] sm:py-3">
              <span className="flex h-9 w-9 items-center justify-center text-white/45">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </span>
              <p className="text-[11px] font-semibold leading-tight text-white/88 sm:text-xs">Secure & private</p>
              <p className="text-[10px] leading-snug text-white/36 sm:text-[11px]">Your files are safe</p>
            </li>
          </ul>

          <div className="mt-7 flex w-full max-w-[min(100%,22rem)] flex-col items-center gap-1.5 sm:mt-8">
            <p className="text-center text-[11px] leading-relaxed text-white/34 md:text-[12px]">
              Professional AI mastering in seconds.{" "}
              <span className="text-white/28">Pay only for the masters you export.</span>
            </p>
            <Link
              href="/pricing"
              className="text-[10px] font-normal text-white/26 underline-offset-[5px] transition hover:text-white/40 hover:underline md:text-[11px]"
            >
              Pricing
            </Link>
          </div>

          <div className="mt-8 flex w-full max-w-[min(100%,22rem)] flex-col gap-2.5 sm:mt-9">
            <button
              type="button"
              disabled={!file}
              onClick={() => router.push("/master/settings")}
              className="w-full rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#4338ca] to-[#0e7490] px-8 py-3.5 text-[14px] font-semibold text-white shadow-[0_0_22px_rgba(91,33,182,0.28),0_0_14px_rgba(14,116,144,0.14),inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 sm:py-4 sm:text-[16px]"
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
        </div>
      </div>
    </div>
  )
}
