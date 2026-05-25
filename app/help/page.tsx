import { Suspense } from "react"
import HelpCenterClient from "./HelpCenterClient"

export default function HelpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/50">Loading help…</div>
      }
    >
      <HelpCenterClient />
    </Suspense>
  )
}
