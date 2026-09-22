import type { Metadata } from "next"
import TermsClient from "./TermsClient"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service | Mastrify",
  description: "Terms for using Mastrify mastering and analysis services.",
  path: "/terms",
})

export default function TermsPage() {
  return <TermsClient />
}
