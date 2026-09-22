import type { ReactNode } from "react"
import type { Metadata } from "next"
import { buildPageMetadata } from "../../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Mastering in Progress | Mastrify",
  description: "Your track is being mastered.",
  path: "/master/processing",
  noIndex: true,
})

export default function MasterProcessingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
