import CinematicBackground from "../../components/CinematicBackground"
import MasterResultClient from "./MasterResultClient"

export default function MasterResultPage() {
  return (
    <div className="master-result-page relative text-white">
      <CinematicBackground intensity="subtle" />
      <MasterResultClient />
    </div>
  )
}
