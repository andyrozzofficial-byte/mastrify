"use client"

import Link from "next/link"
import type { RefObject } from "react"
import MarketingActionSlot from "../cinematic/MarketingActionSlot"
import MarketingDesktopHero from "../cinematic/MarketingDesktopHero"
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
  return (
    <MarketingDesktopHero>
      <span className="hero-eyebrow-pill">Perceptual mix intelligence</span>

      <h1 className="marketing-hero-title">
        See what your mix
        <span className="marketing-hero-title-accent">actually needs</span>
      </h1>

      <p className="hero-lead lg:mx-0">
        Perceptual analysis maps dynamics, balance, and release readiness — the first step in an intelligent mastering
        journey, before you commit to the final master.
      </p>

      <ul className="marketing-hero-bullets">
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

      <AnalyzeStepRail phase={phase} className="marketing-hero-step-rail justify-start" />

      <MarketingActionSlot>
        <AnalyzeUploadCard
          file={file}
          fileInputRef={fileInputRef}
          onFileInputChange={onFileInputChange}
          onScanClick={onScanClick}
        />
      </MarketingActionSlot>

      <CinematicTrustRow items={TRUST} />

      <p className="marketing-hero-footer-note">
        <Link
          href="/how-it-works"
          className="transition hover:text-violet-200/70 hover:underline hover:underline-offset-2"
        >
          Why Mastrify
        </Link>
        <span className="mx-2 text-white/48">·</span>
        Supported formats &amp; tips
      </p>
    </MarketingDesktopHero>
  )
}
