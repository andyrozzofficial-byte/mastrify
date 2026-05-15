import type { Metadata } from "next"
import PrivacyClient from "./PrivacyClient"

export const metadata: Metadata = {
  title: "Privacy Policy | Mastrify",
  description: "How Mastrify handles your music uploads, data, and payments.",
}

export default function PrivacyPage() {
  return <PrivacyClient />
}
