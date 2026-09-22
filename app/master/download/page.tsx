import { Suspense } from "react"
import SecureDownloadClient from "./SecureDownloadClient"

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
