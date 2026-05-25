import { Suspense } from "react"
import BetaFeedbackDashboard from "./BetaFeedbackDashboard"

export const metadata = {
  title: "Beta Feedback Analytics | Mastrify Admin",
  robots: { index: false, follow: false },
}

export default function AdminBetaFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-white/50">
          Loading analytics…
        </div>
      }
    >
      <BetaFeedbackDashboard />
    </Suspense>
  )
}
