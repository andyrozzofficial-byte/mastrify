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
  onChooseClick: () => void
  onContinue: () => void
}

export default function MasterUploadHero({
  file,
  fileInputRef,
  onFileSelected,
  onChooseClick,
  onContinue,
}: Props) {
  const reduce = useReducedMotion()
  const [engineStep, setEngineStep] = useState(0)
  const loaded = Boolean(file)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setEngineStep((s) => (s + 1) % 5), 4000)
    return () => clearInterval(id)
  }, [reduce])

  useEffect(() => {
    if (!loaded || reduce) return
    setEngineStep(1)
  }, [loaded, reduce])

  return (
    <section className="relative w-full">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent_55%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:gap-14 xl:gap-16"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
      >
        <div className="flex flex-col">
          <span className="inline-flex w-fit rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70 backdrop-blur-md">
            Spatial mastering engine
          </span>

          <h1 className="mt-6 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2.35rem] md:text-[2.65rem]">
            Release-ready masters
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
              with musical depth
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-[15px] leading-[1.65] text-white/74 md:text-[16px] md:leading-[1.7]">
            Hand your mix to an intelligent mastering engine that listens with restraint — shaping loudness, space,
            and tone while preserving what makes your music feel alive.
          </p>

          <ul className="mt-6 space-y-2.5 text-[14px] text-white/70">
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
              Perceptual processing tuned to your mix, not a one-size chain
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
              Style and loudness goals you control before the final render
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
              The same cinematic engine that powers processing and results
            </li>
          </ul>

          <MasterFlowStepRail phase="upload" className="mt-8 justify-start md:mt-9" />

          <motion.div className="mt-6 w-full max-w-[29.5rem] lg:max-w-none">
            <MasterUploadCard
              file={file}
              fileInputRef={fileInputRef}
              onFileSelected={onFileSelected}
              onChooseClick={onChooseClick}
              onContinue={onContinue}
            />
          </motion.div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
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
          </div>

          <p className="mt-5 text-[11px] text-white/60">
            <Link href="/how-it-works" className="text-violet-200/55 underline-offset-2 transition hover:text-violet-200/80 hover:underline">
              Why Mastrify
            </Link>
            <span className="mx-2 text-white/48">·</span>
            <Link href="/pricing" className="text-white/60 underline-offset-2 transition hover:text-white/75 hover:underline">
              Pricing
            </Link>
            <span className="mx-2 text-white/48">·</span>
            <Link href="/flow" className="text-white/60 underline-offset-2 transition hover:text-white/75 hover:underline">
              One-page master
            </Link>
          </p>
        </div>

        <motion.div
          className="relative mx-auto flex w-full max-w-[26rem] justify-center lg:sticky lg:top-20 lg:max-w-none lg:justify-end"
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.1, ease: EASE }}
        >
          <LandingHeroAtmosphere />
          <motion.div
            className="relative w-full max-w-[min(24rem,92vw)] lg:max-w-[28rem]"
            animate={loaded ? { scale: 1.02 } : { scale: 1 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <HeroWaveBackdrop heightClass="h-[40%]" className={loaded ? "opacity-[0.26]" : "opacity-[0.2]"} />
            <motion.div
              className="pointer-events-none absolute inset-x-[8%] bottom-[4%] h-[34%] opacity-[0.12]"
              aria-hidden
              animate={reduce ? undefined : { opacity: loaded ? [0.12, 0.22, 0.12] : [0.08, 0.16, 0.08] }}
              transition={{ duration: loaded ? 4 : 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="masterHeroSpec" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(139,92,246,0)" />
                    <stop offset="40%" stopColor="rgba(139,92,246,0.45)" />
                    <stop offset="70%" stopColor="rgba(56,189,248,0.4)" />
                    <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                  </linearGradient>
                </defs>
                <motion.path
                  fill="none"
                  stroke="url(#masterHeroSpec)"
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
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
