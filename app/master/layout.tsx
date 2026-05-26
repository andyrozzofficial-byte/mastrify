import type { ReactNode } from "react"
import BetaExperienceBanner from "../components/master/BetaExperienceBanner"

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="relative z-20 mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6 sm:pt-4">
        <BetaExperienceBanner />
      </div>
      {children}
    </>
  )
}
