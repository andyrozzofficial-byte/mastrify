"use client"

import { motion } from "framer-motion"
import CinematicWaveform from "../audio/CinematicWaveform"
import MasteringEngineVisual from "../../master/processing/MasteringEngineVisual"
import AnalysisStageList, { ANALYSIS_STEPS } from "./AnalysisStageList"

type Props = {
  activeStep: number
  file: File | null
}

/** Maps analyze step index (6 steps) onto the engine's 5 visual stages — same progression as master. */
function engineVisualStep(activeStep: number): number {
  const last = Math.max(ANALYSIS_STEPS.length - 1, 1)
  return Math.min(Math.round((activeStep / last) * 4), 4)
}

export default function AnalyzeProcessingView({ activeStep, file }: Props) {
  const visualStep = engineVisualStep(activeStep)

  return (
    <motion.div
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient lab depth — identical to master/processing */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_12%,rgba(99,102,241,0.07),transparent_58%)]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[18%] h-[min(420px,60vw)] w-[min(580px,85vw)] -translate-x-1/2 rounded-full bg-violet-600/[0.04] blur-[64px]"
        animate={{ opacity: [0.28, 0.42, 0.28] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <motion.header
        className="relative z-20 flex w-full shrink-0 items-center justify-center px-4 pt-7 sm:px-6 sm:pt-8 md:pt-10"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/70 backdrop-blur-md">
          Perceptual mix intelligence
        </span>
      </motion.header>

      <div className="fluid-surface relative z-10 mx-auto flex max-w-[52rem] flex-1 flex-col items-center justify-center px-4 pb-10 pt-4 sm:px-5 md:px-8 md:pb-14">
        <motion.div
          className="w-full max-w-xl min-w-0 text-center md:max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200/45 md:text-xs">
            Listening to your music
          </p>
          <h1 className="mt-4 text-[1.62rem] font-semibold leading-[1.13] tracking-[-0.03em] text-white min-[430px]:text-[1.75rem] sm:text-[2.15rem] md:text-[2.65rem] md:leading-[1.08]">
            Analyzing your mix
            <span className="mt-1 block bg-gradient-to-r from-violet-200 via-white to-violet-100/90 bg-clip-text text-transparent">
              with spatial perception
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-white/72 md:text-[15px] md:leading-relaxed">
            Mapping dynamics, stereo width, and tonal balance — building a perceptual portrait of
            your mix.
          </p>
        </motion.div>

        <motion.div
          className="relative mt-8 min-h-[min(14rem,42vw)] w-full max-w-full overflow-visible md:mt-10 md:min-h-[16rem]"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="marketing-hero-orb relative mx-auto w-full overflow-visible">
            <div className="hero-engine-orb-cage relative mx-auto w-full overflow-visible max-lg:mx-auto">
              <MasteringEngineVisual activeStep={visualStep} className="marketing-engine-visual" />
            </div>
          </div>
        </motion.div>

        {file && (
          <motion.div
            className="relative mt-5 min-h-[4.75rem] w-full max-w-lg overflow-hidden px-0.5 md:mt-6 md:min-h-[5rem] md:max-w-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          >
            <CinematicWaveform
              mode="processing"
              audioSrc={file}
              activeStep={visualStep}
              height={72}
              className="shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_48px_rgba(0,0,0,0.35)]"
            />
          </motion.div>
        )}

        <motion.div
          className="relative mt-2 w-full max-w-lg min-w-0 px-0.5 md:mt-4 md:max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent opacity-50 blur-sm"
            animate={{ opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="fluid-surface relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-black/50 px-3.5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:px-4 sm:py-5 md:px-6 md:py-6"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_22%,transparent_100%)]"
              aria-hidden
            />
            <AnalysisStageList activeStep={activeStep} />
          </motion.div>
        </motion.div>

        <motion.p
          className="mt-6 text-center text-[12px] tracking-wide text-white/60 md:text-[13px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          The engine is mapping your mix — this usually takes a moment
        </motion.p>
      </div>
    </motion.div>
  )
}
