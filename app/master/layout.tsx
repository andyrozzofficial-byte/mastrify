import type { ReactNode } from "react"
import BetaMasterFlowStatus from "../components/master/BetaMasterFlowStatus"

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BetaMasterFlowStatus />
      {children}
    </>
  )
}
