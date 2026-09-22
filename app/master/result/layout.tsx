import type { ReactNode } from "react"
import type { Metadata } from "next"
import { buildPageMetadata } from "../../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Master Result | Mastrify",
  description: "Preview and download your mastered track.",
  path: "/master/result",
  noIndex: true,
})

export default function MasterResultLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
