import CinematicBackground from "../../components/CinematicBackground"
import MasterResultClient from "./MasterResultClient"

export default function MasterResultPage() {
  return (
    <div className="relative text-white">
      <CinematicBackground intensity="subtle" marketingLite gradientOnly />
      <MasterResultClient />
    </div>
  )
}
