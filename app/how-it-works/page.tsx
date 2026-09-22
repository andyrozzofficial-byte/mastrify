import type { Metadata } from "next"
import HowItWorksClient from "./HowItWorksClient"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Why Mastrify | Mastrify",
  description:
    "Learn how Mastrify masters your music with perceptual analysis, musical transparency, and intelligent loudness — while preserving the identity of your mix.",
  path: "/how-it-works",
})

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
