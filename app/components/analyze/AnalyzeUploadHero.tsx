"use client"

import Link from "next/link"
import { useEngineStepRotation } from "../../../lib/useEngineStepRotation"
import type { RefObject } from "react"
import CinematicHeroLayout from "../cinematic/CinematicHeroLayout"
import CinematicTrustRow from "../cinematic/CinematicTrustRow"
import AnalyzeStepRail, { type AnalyzePhase } from "./AnalyzeStepRail"
import AnalyzeUploadCard from "./AnalyzeUploadCard"

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
  const engineStep = useEngineStepRotation()

  return (
    <CinematicHeroLayout engineStep={engineStep}>
      <span className="hero-eyebrow-pill">Perceptual mix intelligence</span>

      <h1 className="marketing-hero-title mt-3.5 text-[1.65rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:mt-6 sm:text-[2.1rem] md:text-[3.1rem] md:leading-[1.08]">
        See what your mix
        <span className="mt-2 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
          actually needs
        </span>
      </h1>

      <p className="hero-lead lg:mx-0">
        Perceptual analysis maps dynamics, balance, and release readiness — the first step in an intelligent mastering
        journey, before you commit to the final master.
      </p>

      <ul className="marketing-hero-bullets mx-auto mt-5 max-w-md space-y-2.5 text-left text-[14px] leading-[1.55] text-white/70 sm:mt-7 sm:space-y-3 lg:mx-0">
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

      <AnalyzeStepRail phase={phase} className="mt-6 justify-start sm:mt-8" />

      <div className="cinematic-upload-slot mt-6 sm:mt-8">
        <AnalyzeUploadCard
          file={file}
          fileInputRef={fileInputRef}
          onFileInputChange={onFileInputChange}
          onScanClick={onScanClick}
        />
      </div>

      <CinematicTrustRow items={TRUST} className="mt-5 sm:mt-7 lg:mt-6" />

      <p className="mt-4 text-center text-[13px] text-support-68 sm:mt-5 lg:text-left">
        <Link
          href="/how-it-works"
          className="transition hover:text-violet-200/70 hover:underline hover:underline-offset-2"
        >
          Why Mastrify
        </Link>
        <span className="mx-2 text-white/48">·</span>
        Supported formats &amp; tips
      </p>
    </CinematicHeroLayout>
  )
}
