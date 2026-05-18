"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState, type RefObject } from "react"
import HeroEngineOrb from "../HeroEngineOrb"
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
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileInputChange: (file: File) => void
  onScanClick: () => void
}

export default function AnalyzeUploadHero({
  phase,
  file,
  fileInputRef,
  onFileInputChange,
  onScanClick,
}: Props) {
  const reduce = useReducedMotion()
  const [engineStep, setEngineStep] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setEngineStep((s) => (s + 1) % 5), 4000)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <section className="hero-section relative w-full md:pb-10">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative isolate grid min-w-0 gap-7 max-lg:grid-cols-1 max-lg:gap-8 lg:mx-auto lg:w-full lg:max-w-[1010px] lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:items-start lg:gap-10 xl:max-w-[1040px] xl:gap-12"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <motion.div className="relative z-10 flex min-w-0 flex-col max-lg:order-1 lg:w-full lg:max-w-[31rem] lg:justify-self-center">
          <span className="hero-eyebrow-pill">Perceptual mix intelligence</span>

          <h1 className="mt-3.5 text-[1.62rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white min-[430px]:text-[1.85rem] sm:mt-5 sm:text-[2.35rem] md:text-[2.65rem]">
            See what your mix
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
              actually needs
            </span>
          </h1>

          <p className="hero-lead">
            Perceptual analysis maps dynamics, balance, and release readiness — the first step in an intelligent
            mastering journey, before you commit to the final master.
          </p>

          <ul className="mt-6 space-y-2.5 text-[14px] text-white/70">
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

          <div className="mt-8 w-full max-w-[29.5rem] min-w-0 lg:max-w-none">
            <AnalyzeUploadCard
              file={file}
              fileInputRef={fileInputRef}
              onFileInputChange={onFileInputChange}
              onScanClick={onScanClick}
            />
          </div>

          <motion.div className="mt-8 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
            {TRUST.map((item, i) => (
              <motion.div
                key={item.title}
                className="rounded-lg border border-white/[0.05] bg-black/[0.28] px-3 py-3 text-center backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: EASE }}
              >
                <p className="text-[11px] font-medium text-white/72">{item.title}</p>
                <p className="mt-0.5 text-[10px] text-white/60">{item.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          <p className="mt-6 text-[11px] text-white/60">
            <Link
              href="/how-it-works"
              className="text-violet-200/55 underline-offset-2 transition hover:text-violet-200/80 hover:underline"
            >
              Why Mastrify
            </Link>
            <span className="mx-2 text-white/48">·</span>
            Supported formats &amp; tips
          </p>
        </motion.div>

        <HeroEngineOrb
          activeStep={engineStep}
          compactAtmosphere
          mobileGlowBoost
          className="relative z-0 max-lg:order-2 max-lg:mt-1 lg:sticky lg:top-24 lg:justify-self-center"
        />
      </motion.div>
    </section>
  )
}
