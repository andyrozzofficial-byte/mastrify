"use client"

import Link from "next/link"
import { useEngineStepRotation } from "../../../lib/useEngineStepRotation"
import type { RefObject } from "react"
import CinematicHeroLayout from "../cinematic/CinematicHeroLayout"
import CinematicTrustRow from "../cinematic/CinematicTrustRow"
import MasterFlowStepRail from "./MasterFlowStepRail"
import MasterUploadCard from "./MasterUploadCard"

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
  const engineStep = useEngineStepRotation()

  return (
    <CinematicHeroLayout engineStep={engineStep}>
      <span className="hero-eyebrow-pill">Spatial mastering engine</span>

      <h1 className="marketing-hero-title mt-3.5 text-[1.65rem] font-semibold leading-[1.14] tracking-[-0.03em] text-white sm:mt-6 sm:text-[2.1rem] md:text-[3.1rem] md:leading-[1.08]">
        Release-ready masters
        <span className="mt-2 block bg-gradient-to-r from-violet-200 via-white to-sky-200/90 bg-clip-text text-transparent">
          with musical depth
        </span>
      </h1>

      <p className="hero-lead lg:mx-0">
        Hand your mix to an intelligent mastering engine that listens with restraint — shaping loudness,
        space, and tone while preserving what makes your music feel alive.
      </p>

      <ul className="marketing-hero-bullets mx-auto mt-5 max-w-md space-y-2.5 text-left text-[14px] leading-[1.55] text-white/70 sm:mt-7 sm:space-y-3 lg:mx-0">
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/70" aria-hidden />
          Perceptual processing tuned to your mix, not a one-size chain
        </li>
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/55" aria-hidden />
          Style and loudness goals you control before the final render
        </li>
        <li className="flex gap-2.5 max-lg:hidden">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          The same cinematic engine that powers processing and results
        </li>
      </ul>

      <MasterFlowStepRail phase="upload" className="mt-6 justify-start sm:mt-8" />

      <div className="cinematic-upload-slot mt-6 sm:mt-8">
        <MasterUploadCard
          file={file}
          fileInputRef={fileInputRef}
          onFileSelected={onFileSelected}
          onContinue={onContinue}
        />
      </div>

      <CinematicTrustRow items={FEATURES} className="mt-5 sm:mt-7 lg:mt-6" />

      <p className="mt-4 text-center text-[13px] text-support-68 sm:mt-5 lg:text-left">
        <Link
          href="/how-it-works"
          className="transition hover:text-violet-200/70 hover:underline hover:underline-offset-2"
        >
          Why Mastrify
        </Link>
        <span className="mx-2 text-white/48">·</span>
        <Link href="/pricing" className="transition hover:text-white/75 hover:underline hover:underline-offset-2">
          Pricing
        </Link>
      </p>
    </CinematicHeroLayout>
  )
}
