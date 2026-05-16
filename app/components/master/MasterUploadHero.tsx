"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState, type RefObject } from "react"
import HeroWaveBackdrop from "../HeroWaveBackdrop"
import LandingHeroAtmosphere from "../LandingHeroAtmosphere"
import MasteringEngineVisual from "../../master/processing/MasteringEngineVisual"
import MasterFlowStepRail from "./MasterFlowStepRail"
import MasterUploadCard from "./MasterUploadCard"

const EASE = [0.22, 1, 0.36, 1] as const

const FEATURES = [
  { title: "Musical intelligence", sub: "Adapts to your material" },
  { title: "Transparent dynamics", sub: "Punch and movement preserved" },
  { title: "Release-ready", sub: "Streaming loudness targets" },
] as const

type Props = {
  file: File | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelected: (file: File) => void
  onContinue: () => void
}

export default function MasterUploadHero({
  file,
  fileInputRef,
  onFileSelected,
  onContinue,
}: Props) {
  const reduce = useReducedMotion()
  const [engineStep, setEngineStep] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setEngineStep((s) => (s + 1) % 5), 4000)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <section className="hero-section relative w-full overflow-visible">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative grid gap-6 max-lg:grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:gap-14 xl:gap-16"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <motion.div className="flex min-w-0 flex-col max-lg:order-1">
          <span className="hero-eyebrow-pill sm:tracking-[0.22em]">Spatial mastering engine</span>

          <h1 className="mt-3 text-[1.55rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:mt-4 sm:text-[2rem] md:text-[2.65rem] md:leading-[1.12]">
            Release-ready masters
            <span className="mt-0.5 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent sm:mt-1">
              with musical depth
            </span>
          </h1>

          <p className="hero-lead text-[14px] sm:text-[15px] md:mt-6">
            <span className="lg:hidden">Intelligent mastering that preserves punch, space, and tone — shaped for release.</span>
            <span className="hidden lg:inline">
              Hand your mix to an intelligent mastering engine that listens with restraint — shaping loudness, space,
              and tone while preserving what makes your music feel alive.
            </span>
          </p>

          <ul className="mt-4 hidden space-y-2 text-[13px] text-white/70 sm:block sm:space-y-2.5 sm:text-[14px] md:mt-6">
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
              Perceptual processing tuned to your mix, not a one-size chain
            </li>
            <li className="flex gap-2.5 max-md:hidden">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
              Style and loudness goals you control before the final render
            </li>
            <li className="flex gap-2.5 max-lg:hidden">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
              The same cinematic engine that powers processing and results
            </li>
          </ul>

          <MasterFlowStepRail phase="upload" className="mt-4 justify-start sm:mt-5 md:mt-8" />

          <motion.div className="mt-4 w-full max-w-[29.5rem] sm:mt-5 lg:max-w-none">
            <MasterUploadCard
              file={file}
              fileInputRef={fileInputRef}
              onFileSelected={onFileSelected}
              onContinue={onContinue}
            />
          </motion.div>

          <motion.div className="hidden gap-2 sm:mt-5 sm:grid sm:grid-cols-3 sm:gap-2.5 lg:mt-6">
            {FEATURES.map((item, i) => (
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

          <p className="mt-4 text-[10px] leading-relaxed text-white/58 sm:mt-5 sm:text-[11px]">
            <Link href="/how-it-works" className="text-violet-200/55 underline-offset-2 transition hover:text-violet-200/80 hover:underline">
              Why Mastrify
            </Link>
            <span className="mx-1.5 text-white/48 sm:mx-2">·</span>
            <Link href="/pricing" className="text-white/60 underline-offset-2 transition hover:text-white/75 hover:underline">
              Pricing
            </Link>
          </p>
        </motion.div>

        <motion.div
          className="relative mx-auto flex w-full max-w-[14rem] justify-center overflow-visible max-lg:order-2 max-lg:py-3 sm:max-w-[16rem] sm:max-lg:py-4 lg:sticky lg:top-20 lg:max-w-none lg:justify-end lg:py-0"
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.1, ease: EASE }}
        >
          <div className="hero-orb-radial-mobile" aria-hidden />
          <LandingHeroAtmosphere compact mobileGlowBoost />
          <motion.div className="relative w-full max-w-[min(14rem,78vw)] overflow-visible sm:max-w-[16rem] lg:max-w-[28rem]">
            <HeroWaveBackdrop heightClass="h-[32%] lg:h-[40%]" className="opacity-[0.14] lg:opacity-[0.2]" />
            <MasteringEngineVisual
              activeStep={engineStep}
              className="relative z-[1] mx-auto w-[min(11.5rem,72vw)] max-w-[14rem] sm:w-[min(13rem,76vw)] sm:max-w-[16rem] md:w-[min(18rem,40vw)] md:max-w-[22rem] lg:w-[min(22rem,40vw)] lg:max-w-[26rem]"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
