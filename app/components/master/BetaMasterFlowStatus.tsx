"use client"

import { usePathname } from "next/navigation"
import BetaMasterStatusCard from "./BetaMasterStatusCard"

/** Beta status card on master sub-routes (not upload — card lives in upload hero). */
export default function BetaMasterFlowStatus() {
  const pathname = usePathname()
  const isUploadRoot = pathname === "/master" || pathname === "/master/"
  const isResultPage =
    pathname === "/master/result" || pathname.startsWith("/master/result/")

  if (isUploadRoot || isResultPage) return null

  return (
    <div className="relative z-20 mx-auto mb-2 w-full max-w-[var(--mkt-action-width,100%)] px-4 sm:mb-2.5 sm:px-6">
      <BetaMasterStatusCard />
    </div>
  )
}
