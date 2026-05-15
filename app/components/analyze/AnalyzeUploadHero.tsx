"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState, type RefObject } from "react"
import HeroWaveBackdrop from "../HeroWaveBackdrop"
import LandingHeroAtmosphere from "../LandingHeroAtmosphere"
import MasteringEngineVisual from "../../master/processing/MasteringEngineVisual"
import AnalyzeStepRail, { type AnalyzePhase } from "./AnalyzeStepRail"
import AnalyzeUploadCard from "./AnalyzeUploadCard"

const EASE = [0.22, 1, 0.36, 1] as const

const TRUST = [
  { title: "100% free", sub: "No credit card" },
  { title: "Private & secure", sub: "Your files stay yours" },
  { title: "Instant results", sub: "About 30 seconds" },
] as const

type Props = {
  phase: AnalyzePhase
  file: File | null
  loading: boolean
  loadingStep: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileInputChange: (file: File) => void
  onUploadClick: () => void
}

export default function AnalyzeUploadHero({
  phase,
  file,
  loading,
  loadingStep,
  fileInputRef,
  onFileInputChange,
  onUploadClick,
}: Props) {
  const reduce = useReducedMotion()
  const [engineStep, setEngineStep] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setEngineStep((s) => (s + 1) % 5), 4000)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <section className="relative w-full pb-6 md:pb-10">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:gap-14 xl:gap-16">
        <motion.div
          className="flex flex-col"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <span className="inline-flex w-fit rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70 backdrop-blur-md">
            Perceptual mix intelligence
          </span>

          <h1 className="mt-5 text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.35rem] md:text-[2.65rem]">
            See what your mix
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
              actually needs
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/44 md:text-[16px]">
            Perceptual analysis maps dynamics, balance, and release readiness — the first step in an intelligent
            mastering journey, before you commit to the final master.
          </p>

          <ul className="mt-6 space-y-2.5 text-[14px] text-white/40">
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
              Understand loudness, width, and tone with engineer-level clarity
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
              Know what to fix in the mix — and what is already working
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
              Flow straight into mastering when your material is ready
            </li>
          </ul>

          <AnalyzeStepRail phase={phase} className="mt-8 justify-start md:mt-9" />

          <div className="mt-8 w-full max-w-[29.5rem] lg:max-w-none">
            <AnalyzeUploadCard
              file={file}
              loading={loading}
              loadingStep={loadingStep}
              fileInputRef={fileInputRef}
              onFileInputChange={onFileInputChange}
              onUploadClick={onUploadClick}
            />
          </div>

          <div className="mt-8 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
            {TRUST.map((item, i) => (
              <motion.div
                key={item.title}
                className="rounded-lg border border-white/[0.05] bg-black/[0.28] px-3 py-3 text-center backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: EASE }}
              >
                <p className="text-[11px] font-medium text-white/72">{item.title}</p>
                <p className="mt-0.5 text-[10px] text-white/28">{item.sub}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-6 text-[11px] text-white/28">
            <Link
              href="/how-it-works"
              className="text-violet-200/55 underline-offset-2 transition hover:text-violet-200/80 hover:underline"
            >
              Why Mastrify
            </Link>
            <span className="mx-2 text-white/18">·</span>
            Supported formats &amp; tips
          </p>
        </motion.div>

        <motion.div
          className="relative mx-auto flex w-full max-w-[26rem] justify-center lg:sticky lg:top-24 lg:max-w-none lg:justify-end"
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.1, ease: EASE }}
        >
          <LandingHeroAtmosphere />
          <div className="relative w-full max-w-[min(24rem,92vw)] lg:max-w-[28rem]">
            <HeroWaveBackdrop heightClass="h-[40%]" className="opacity-[0.2]" />
            <motion.div
              className="pointer-events-none absolute inset-x-[8%] bottom-[4%] h-[34%] opacity-[0.12]"
              aria-hidden
              animate={reduce ? undefined : { opacity: [0.08, 0.16, 0.08] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="analyzeHeroSpec" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(139,92,246,0)" />
                    <stop offset="40%" stopColor="rgba(139,92,246,0.45)" />
                    <stop offset="70%" stopColor="rgba(56,189,248,0.4)" />
                    <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                  </linearGradient>
                </defs>
                <motion.path
                  fill="none"
                  stroke="url(#analyzeHeroSpec)"
                  strokeWidth="1.5"
                  d="M0,42 Q50,28 100,40 T200,38 T300,44 T400,36"
                  animate={
                    reduce
                      ? undefined
                      : {
                          d: [
                            "M0,42 Q50,28 100,40 T200,38 T300,44 T400,36",
                            "M0,40 Q50,34 100,38 T200,42 T300,40 T400,38",
                            "M0,42 Q50,28 100,40 T200,38 T300,44 T400,36",
                          ],
                        }
                  }
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>
            <MasteringEngineVisual
              activeStep={engineStep}
              className="relative z-[1] mx-auto w-[min(20rem,88vw)] max-w-[24rem] md:w-[min(22rem,40vw)] md:max-w-[26rem]"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
