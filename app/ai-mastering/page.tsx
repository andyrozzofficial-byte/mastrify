import type { Metadata } from "next"
import JsonLd from "../components/JsonLd"
import AiMasteringClient from "./AiMasteringClient"
import { FAQ } from "./faq"
import { buildPageMetadata, faqPageJsonLd, softwareApplicationJsonLd } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "AI Mastering Online — Streaming-Ready Masters",
  description:
    "Master your tracks with online AI mastering built for release-ready loudness and tone. Upload your mix, preview the result, and download a full-quality WAV — no subscription.",
  path: "/ai-mastering",
  ogTitle: "AI Mastering Online | Mastrify",
  keywords: [
    "AI mastering",
    "online mastering",
    "AI audio mastering",
    "Mastrify",
    "streaming-ready master",
  ],
})

export default function AiMasteringPage() {
  return (
    <>
      <JsonLd data={[softwareApplicationJsonLd(), faqPageJsonLd(FAQ)]} />
      <AiMasteringClient />
    </>
  )
}
