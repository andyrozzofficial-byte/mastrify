import type { ReactNode } from "react"
import type { Metadata } from "next"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Master Your Track Online | Mastrify",
  description:
    "Upload your stereo mix and get AI mastering online with release-ready loudness and tone. Preview before you pay and download a full-quality WAV master.",
  path: "/master",
  ogTitle: "Online AI Mastering | Mastrify",
})

export default function MasterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
