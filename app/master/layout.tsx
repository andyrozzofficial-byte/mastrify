import type { ReactNode } from "react"
import BetaMasterFlowStatus from "../components/master/BetaMasterFlowStatus"
import "./master-workstation.css"

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="master-workstation-root">
      <BetaMasterFlowStatus />
      {children}
    </div>
  )
}
