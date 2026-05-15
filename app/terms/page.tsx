import type { Metadata } from "next"
import TermsClient from "./TermsClient"

export const metadata: Metadata = {
  title: "Terms of Service | Mastrify",
  description: "Terms for using Mastrify mastering and analysis services.",
}

export default function TermsPage() {
  return <TermsClient />
}
