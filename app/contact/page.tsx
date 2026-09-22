import type { Metadata } from "next"
import ContactClient from "./ContactClient"
import { buildPageMetadata } from "../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Contact | Mastrify",
  description: "Get in touch with the Mastrify team for support and questions.",
  path: "/contact",
})

export default function ContactPage() {
  return <ContactClient />
}
