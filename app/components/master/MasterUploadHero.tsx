"use client"

import Link from "next/link"
import type { RefObject } from "react"
import MarketingActionSlot from "../cinematic/MarketingActionSlot"
import MarketingDesktopHero from "../cinematic/MarketingDesktopHero"
import CinematicTrustRow from "../cinematic/CinematicTrustRow"
import BetaMasterStatusCard from "./BetaMasterStatusCard"
import MasterFlowStepRail from "./MasterFlowStepRail"
import type { MasterWorkflowPhase } from "../../../lib/masterWorkflow"
import UploadCard from "../upload/UploadCard"
import UploadSectionDivider from "../upload/UploadSectionDivider"

const FEATURES = [
  { title: "Musical intelligence", sub: "Adapts to your material" },
  { title: "Transparent dynamics", sub: "Punch and movement preserved" },
  { title: "Release-ready", sub: "Streaming loudness targets" },
] as const

type Props = {
  file: File | null
  stepRailPhase?: MasterWorkflowPhase
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelected: (file: File) => void
  onContinue: () => void
  continueLoading?: boolean
}

export default function MasterUploadHero({
  file,
  stepRailPhase = "upload",
  fileInputRef,
  onFileSelected,
  onContinue,
  continueLoading = false,
}: Props) {
  const orbMode = continueLoading ? "active" : "passive"
  return (
    <MarketingDesktopHero variant="product" orbMode={orbMode}>
      <span className="hero-eyebrow-pill">Spatial mastering engine</span>

      <h1 className="marketing-hero-title">
        Release-ready masters
        <span className="marketing-hero-title-accent">with musical depth</span>
      </h1>

      <p className="hero-lead lg:mx-0">
        Hand your mix to an intelligent mastering engine that listens with restraint — shaping loudness, space, and tone
        while preserving what makes your music feel alive.
      </p>

      <ul className="marketing-hero-bullets">
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" aria-hidden />
          Perceptual processing tuned to your mix, not a one-size chain
        </li>
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/45" aria-hidden />
          Style and loudness goals you control before the final render
        </li>
        <li className="flex gap-2.5 max-lg:hidden">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400/50" aria-hidden />
          The same engine that powers processing and your finished master
        </li>
      </ul>

      <MasterFlowStepRail phase={stepRailPhase} className="marketing-hero-step-rail justify-start" />

      <MarketingActionSlot className="product-action-stack">
        <BetaMasterStatusCard />
        <div className="product-action-upload-group">
          <UploadSectionDivider />
          <UploadCard
            mode="master"
            file={file}
            fileInputRef={fileInputRef}
            onFileSelected={onFileSelected}
            onPrimaryAction={onContinue}
            primaryActionLoading={continueLoading}
            primaryActionDisabled={continueLoading}
          />
        </div>
      </MarketingActionSlot>

      <CinematicTrustRow items={FEATURES} />

      <p className="marketing-hero-footer-note">
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
    </MarketingDesktopHero>
  )
}
