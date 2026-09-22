import type { ReactNode } from "react"
import type { Metadata } from "next"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Analyze Your Mix | Mastrify",
  description:
    "Free mix analysis with loudness, dynamics, and clarity insights before you master. Upload a track and get actionable feedback in seconds.",
  path: "/analyze",
})

export default function AnalyzeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
