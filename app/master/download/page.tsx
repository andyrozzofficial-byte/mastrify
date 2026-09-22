import type { Metadata } from "next"
import { Suspense } from "react"
import SecureDownloadClient from "./SecureDownloadClient"
import { buildPageMetadata } from "../../../lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Secure Download | Mastrify",
  description: "Private master download link for Mastrify customers.",
  path: "/master/download",
  noIndex: true,
})

export default function SecureDownloadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-black text-sm text-white/65">
          Opening your secure download…
        </div>
      }
    >
      <SecureDownloadClient />
    </Suspense>
  )
}
