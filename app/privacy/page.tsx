import type { Metadata } from "next"
import PrivacyClient from "./PrivacyClient"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy | Mastrify",
  description: "How Mastrify handles your music uploads, data, and payments.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return <PrivacyClient />
}
