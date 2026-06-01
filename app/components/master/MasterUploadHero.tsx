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
  return (
    <MarketingDesktopHero variant="product" workstation>
      <span className="hero-eyebrow-pill">Mastering session</span>

      <h1 className="marketing-hero-title">
        Upload your mix
        <span className="marketing-hero-title-accent marketing-hero-title-accent--workstation">
          and configure your master
        </span>
      </h1>

      <p className="hero-lead lg:mx-0">
        Drop in a stereo mix, set loudness and tone, then render a release-ready master — with dynamics and space kept
        intact.
      </p>

      <ul className="marketing-hero-bullets">
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/45" aria-hidden />
          Perceptual chain tuned to your material, not a preset bake-off
        </li>
        <li className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/35" aria-hidden />
          Style, loudness, width, and clarity controls before render
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
