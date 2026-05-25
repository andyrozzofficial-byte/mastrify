import { redirect } from "next/navigation"

/** Legacy /contact URL → Help Center */
export default function ContactPage() {
  redirect("/help")
}
