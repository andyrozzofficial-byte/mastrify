"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useMemo } from "react"
import CinematicOrbCenter from "../cinematic/CinematicOrbCenter"
import CinematicWaveform from "../audio/CinematicWaveform"
import AnalysisStageList from "./AnalysisStageList"
import "../cinematic/product-processing-view.css"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  activeStep: number
  file: File | null
  fileName?: string
}

export default function AnalyzeProcessingView({ activeStep, file, fileName }: Props) {
  const reduce = useReducedMotion()
  const orbStep = Math.min(activeStep, 4)

  const audioUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  return (
    <div className="page-container product-flow-page-bottom w-full">
    <div className={`product-processing-view ${reduce ? "" : "product-processing-view--enter"}`}>
      <div className="product-processing-view__ambient" aria-hidden />
      <div className="product-processing-view__glow" aria-hidden />

      <header className="product-processing-header">
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/70">
          Perceptual mix intelligence
        </span>
        <div className="product-processing-header__copy">
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200/45 md:text-xs">
            Listening to your music
          </p>
          <h1 className="mt-3 text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2rem] md:text-[2.35rem]">
            Analyzing your mix
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
              with spatial perception
            </span>
          </h1>
          {fileName ? (
            <p className="mt-3 truncate text-[12px] text-white/62 md:text-[13px]">{fileName}</p>
          ) : null}
        </div>
      </header>

      <div className="product-processing-stage">
        <CinematicOrbCenter activeStep={orbStep} />

        {(file || audioUrl) && (
          <motion.div
            className="cinematic-waveform-slot relative min-h-[4.75rem] overflow-hidden"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
          >
            <CinematicWaveform
              mode="processing"
              audioSrc={file ?? audioUrl}
              activeStep={orbStep}
              height={76}
              className="shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_48px_rgba(0,0,0,0.35)]"
            />
          </motion.div>
        )}
      </div>

      <div className="product-processing-card">
        <div className="product-processing-card__halo" aria-hidden />
        <div className="product-surface-card fluid-surface relative overflow-hidden p-4 sm:p-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_22%,transparent_100%)]"
            aria-hidden
          />
          <AnalysisStageList activeStep={activeStep} />
        </div>
        <p className="product-processing-footnote text-[12px] tracking-wide text-white/60 md:text-[13px]">
          The engine is mapping your mix — this usually takes a moment
        </p>
      </div>
    </div>
    </div>
  )
}
