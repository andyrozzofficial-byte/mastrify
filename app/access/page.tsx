import { Suspense } from "react"
import AccessClient from "./AccessClient"

export const metadata = {
  title: "Access | Mastrify",
  description: "Private preview access for Mastrify mastering.",
}

export default function AccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <AccessClient />
    </Suspense>
  )
}
