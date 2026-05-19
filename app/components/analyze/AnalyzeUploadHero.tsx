"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState, type RefObject } from "react"
import ProductUploadHeroLayout from "../product/ProductUploadHeroLayout"
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
    <ProductUploadHeroLayout engineStep={engineStep} showScanSweep>
      <span className="hero-eyebrow-pill">Perceptual mix intelligence</span>

      <h1 className="product-flow-hero-title mt-3 text-[1.48rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white min-[430px]:text-[1.55rem] sm:mt-4 sm:text-[2rem] md:text-[2.65rem] md:leading-[1.12]">
        See what your mix
        <span className="mt-0.5 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent sm:mt-1">
          actually needs
        </span>
      </h1>

      <p className="hero-lead text-[14px] sm:text-[15px] md:mt-6">
        Perceptual analysis maps dynamics, balance, and release readiness — the first step in an intelligent mastering
        journey, before you commit to the final master.
      </p>

      <ul className="mt-4 hidden space-y-2 text-[13px] text-white/70 sm:block sm:space-y-2.5 sm:text-[14px] md:mt-6">
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
          Understand loudness, width, and tone with engineer-level clarity
        </li>
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
          Know what to fix in the mix — and what is already working
        </li>
        <li className="flex gap-2.5 max-lg:hidden">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Flow straight into mastering when your material is ready
        </li>
      </ul>

      <AnalyzeStepRail phase={phase} className="product-flow-step-rail mt-4 justify-start sm:mt-5 md:mt-8" />

      <div className="product-flow-upload-slot mt-4 w-full min-w-0 sm:mt-5">
        <AnalyzeUploadCard
          file={file}
          fileInputRef={fileInputRef}
          onFileInputChange={onFileInputChange}
          onScanClick={onScanClick}
        />
      </div>

      <div className="product-flow-trust-row hidden gap-2 sm:mt-5 sm:grid sm:grid-cols-3 sm:gap-2.5 lg:mt-6">
        {TRUST.map((item, i) => (
          <motion.div
            key={item.title}
            className="product-flow-trust-chip rounded-lg border border-white/[0.05] bg-black/[0.28] px-3 py-3 text-center"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: EASE }}
          >
            <p className="text-[11px] font-medium text-white/72">{item.title}</p>
            <p className="mt-0.5 text-[10px] text-white/60">{item.sub}</p>
          </motion.div>
        ))}
      </div>

      <p className="product-flow-footer-note mt-4 text-[10px] leading-relaxed text-white/58 sm:mt-5 sm:text-[11px]">
        <Link
          href="/how-it-works"
          className="text-violet-200/55 underline-offset-2 transition hover:text-violet-200/80 hover:underline"
        >
          Why Mastrify
        </Link>
        <span className="mx-1.5 text-white/48 sm:mx-2">·</span>
        Supported formats &amp; tips
      </p>
    </ProductUploadHeroLayout>
  )
}
