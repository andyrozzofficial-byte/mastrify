import type { Metadata } from "next"
import ContactClient from "./ContactClient"

export const metadata: Metadata = {
  title: "Contact | Mastrify",
  description: "Get in touch with the Mastrify team for support and questions.",
}

export default function ContactPage() {
  return <ContactClient />
}
