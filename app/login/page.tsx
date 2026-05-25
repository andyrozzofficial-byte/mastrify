import { Suspense } from "react"
import LoginClient from "./LoginClient"

export const metadata = {
  title: "Login | Mastrify",
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] text-white/50">
          Loading…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  )
}
