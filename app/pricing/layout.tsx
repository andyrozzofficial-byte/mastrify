import type { ReactNode } from "react"
import type { Metadata } from "next"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing | Mastrify",
  description:
    "Pay per master export — no subscription. Analyze your mix for free and unlock a full-quality WAV master when you are ready.",
  path: "/pricing",
})

export default function PricingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
