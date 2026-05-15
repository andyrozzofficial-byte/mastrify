"use client"

import { motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { useEffect, useState } from "react"
import CinematicBackground from "../components/CinematicBackground"
import HeroWaveBackdrop from "../components/HeroWaveBackdrop"
import MasteringEngineVisual from "../master/processing/MasteringEngineVisual"

const EASE = [0.22, 1, 0.36, 1] as const

const dawLogos = ["Ableton", "FL Studio", "Logic Pro", "Pro Tools", "Studio One"]

export default function Landing() {
  const reduce = useReducedMotion()
  const [engineStep, setEngineStep] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => {
      setEngineStep((s) => (s + 1) % 5)
    }, 4000)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <CinematicBackground intensity="strong" />

      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_6%,rgba(99,102,241,0.14),transparent_58%),radial-gradient(ellipse_50%_40%_at_88%_70%,rgba(34,211,238,0.06),transparent_50%)]"
        aria-hidden
        animate={reduce ? undefined : { opacity: [0.92, 1, 0.92] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="pointer-events-none absolute left-1/2 top-[14%] h-[min(560px,65vw)] w-[min(720px,90vw)] -translate-x-1/2 rounded-full bg-violet-600/[0.06] blur-[100px]"
        animate={reduce ? undefined : { opacity: [0.45, 0.7, 0.45], scale: [1, 1.03, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-[1080px] px-5 pb-12 pt-12 md:px-10 md:pb-20 md:pt-16 lg:pt-20">
        <motion.div
          className="relative grid items-center gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-16 xl:gap-20"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="text-center lg:max-w-xl lg:text-left">
            <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-200/70 backdrop-blur-md">
              Intelligent mastering engine
            </span>

            <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.65rem] md:text-[3.1rem] md:leading-[1.08] lg:mt-7">
              Music shaped for release
              <span className="mt-2 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
                with musical depth
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-white/44 md:text-[16px] md:leading-relaxed lg:mx-0">
              Mastrify masters with perceptual intelligence — preserving punch, space, and emotional movement while
              bringing your mix to a confident, streaming-ready level.
            </p>

            <ul className="mx-auto mt-7 max-w-md space-y-2.5 text-left text-[14px] text-white/40 lg:mx-0">
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
                Transparent dynamics that respect what your mix already does well
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
                Loudness and tone guided with restraint — not brute-force processing
              </li>
            </ul>

            <div className="mx-auto mt-9 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start">
              <Link
                href="/master"
                className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600/90 via-indigo-600/90 to-indigo-700/90 px-8 text-[14px] font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.14),0_14px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.08] transition hover:brightness-[1.06] sm:flex-none sm:px-9"
              >
                Start mastering
              </Link>
              <Link
                href="/analyze"
                className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-8 text-[14px] font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white sm:flex-none sm:px-9"
              >
                Analyze your mix
              </Link>
            </div>

            <p className="mt-6 text-center text-[13px] text-white/32 lg:text-left">
              <Link
                href="/how-it-works"
                className="transition hover:text-violet-200/70 hover:underline hover:underline-offset-2"
              >
                Why Mastrify
              </Link>
              <span className="mx-2 text-white/20">·</span>
              No signup required to begin
            </p>
          </div>

          <div className="relative mx-auto flex w-full max-w-[26rem] justify-center lg:max-w-none lg:justify-end">
            <div
              className="pointer-events-none absolute inset-[-12%] bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.16),transparent_62%)]"
              aria-hidden
            />
            <motion.div
              className="relative w-full max-w-[min(24rem,92vw)] lg:max-w-[28rem]"
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.12, ease: EASE }}
            >
              <HeroWaveBackdrop heightClass="h-[38%]" className="opacity-[0.18]" />
              <MasteringEngineVisual
                activeStep={engineStep}
                className="relative z-[1] mx-auto w-[min(22rem,88vw)] max-w-[26rem] md:w-[min(24rem,42vw)] md:max-w-[28rem]"
              />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Below fold — mix intelligence */}
      <section className="relative z-10 border-t border-white/[0.06] bg-black/20">
        <div className="mx-auto max-w-[1080px] px-5 py-14 md:px-10 md:py-20">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/45">Before you master</p>
            <h2 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.02em] text-white/92 sm:text-[1.75rem]">
              Understand your mix with clarity
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/40 md:text-[15px]">
              Perceptual analysis highlights dynamics, balance, and release readiness — so you know what your song
              needs before the final master.
            </p>
            <Link
              href="/analyze"
              className="mt-7 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] px-8 text-[14px] font-semibold text-white/88 ring-1 ring-white/[0.05] transition hover:border-white/[0.12] hover:bg-white/[0.06]"
            >
              Run a free mix analysis
            </Link>
          </motion.div>

          <div className="mx-auto mt-16 max-w-[920px] md:mt-20">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <p className="mt-10 text-center text-[12px] tracking-wide text-white/32 md:text-[13px]">
              Trusted by producers and artists worldwide
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
              {dawLogos.map((name) => (
                <li key={name}>
                  <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/28 md:text-[11px]">
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </motion.div>
  )
}
