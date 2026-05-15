import type { Metadata } from "next"
import HowItWorksClient from "./HowItWorksClient"

export const metadata: Metadata = {
  title: "How it works | Mastrify",
  description:
    "Learn how Mastrify masters your music with perceptual analysis, musical transparency, and intelligent loudness — while preserving the identity of your mix.",
}

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
