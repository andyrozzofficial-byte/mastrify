"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useMemo } from "react"
import CinematicWaveform from "../audio/CinematicWaveform"
import LandingHeroAtmosphere from "../LandingHeroAtmosphere"
import MasteringEngineVisual from "../../master/processing/MasteringEngineVisual"
import AnalysisStageList from "./AnalysisStageList"

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
    <motion.div
      className="relative flex min-h-[min(88vh,920px)] w-full flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(6px)" }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_12%,rgba(99,102,241,0.14),transparent_58%),radial-gradient(ellipse_50%_40%_at_85%_75%,rgba(34,211,238,0.06),transparent_50%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[14%] h-[min(480px,65vw)] w-[min(640px,90vw)] -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-[100px]"
        animate={reduce ? undefined : { opacity: [0.45, 0.72, 0.45], scale: [1, 1.04, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <motion.header
        className="relative z-20 flex shrink-0 flex-col items-center px-6 pt-2 md:pt-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/70 backdrop-blur-md">
          Perceptual mix intelligence
        </span>
        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200/45 md:text-xs">
          Listening to your music
        </p>
        <h1 className="mt-3 max-w-2xl text-center text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2rem] md:text-[2.35rem]">
          Analyzing your mix
          <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
            with spatial perception
          </span>
        </h1>
        {fileName ? (
          <p className="mt-3 max-w-md truncate text-center text-[12px] text-white/62 md:text-[13px]">{fileName}</p>
        ) : null}
      </motion.header>

      <motion.div
        className="relative z-10 mx-auto mt-6 flex w-full max-w-[26rem] flex-1 flex-col items-center justify-center px-5 md:mt-8 md:max-w-[28rem]"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
      >
        <div className="relative w-full">
          <LandingHeroAtmosphere />
          <motion.div
            className="pointer-events-none absolute inset-x-[4%] top-[8%] h-[55%] overflow-hidden rounded-full opacity-[0.14]"
            aria-hidden
          >
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent blur-sm"
              animate={reduce ? undefined : { left: ["-20%", "90%"] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
            />
          </motion.div>
          <MasteringEngineVisual activeStep={orbStep} className="relative z-[1] mx-auto" />
        </div>

        {(file || audioUrl) && (
          <motion.div
            className="relative mt-5 min-h-[4.75rem] w-full max-w-lg overflow-hidden px-0.5 md:mt-6 md:min-h-[5rem] md:max-w-xl"
            initial={{ opacity: 0, y: 8 }}
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
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto mt-2 w-full max-w-md min-w-0 px-5 pb-10 md:mt-4 md:max-w-lg md:pb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.15, ease: EASE }}
      >
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-b from-violet-500/20 via-transparent to-cyan-500/10 opacity-60 blur-sm"
          animate={reduce ? undefined : { opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <motion.div className="fluid-surface relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-black/50 px-3.5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:px-4 sm:py-5 md:px-6 md:py-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_22%,transparent_100%)]"
            aria-hidden
          />
          <AnalysisStageList activeStep={activeStep} />
        </motion.div>
        <motion.p
          className="mt-6 text-center text-[12px] tracking-wide text-white/60 md:text-[13px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          The engine is mapping your mix — this usually takes a moment
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
