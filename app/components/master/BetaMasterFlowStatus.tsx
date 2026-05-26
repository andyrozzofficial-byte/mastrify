"use client"

import { usePathname } from "next/navigation"
import BetaMasterStatusCard from "./BetaMasterStatusCard"

/** Beta status card on master sub-routes (not upload — card lives in upload hero). */
export default function BetaMasterFlowStatus() {
  const pathname = usePathname()
  const isUploadRoot = pathname === "/master" || pathname === "/master/"

  if (isUploadRoot) return null

  return (
    <div className="relative z-20 mx-auto mb-3 w-full max-w-3xl px-4 sm:mb-4 sm:px-6">
      <BetaMasterStatusCard />
    </div>
  )
}
