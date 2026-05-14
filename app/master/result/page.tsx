import CinematicBackground from "../../components/CinematicBackground"
import MasterResultClient from "./MasterResultClient"

export default function MasterResultPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] text-white md:min-h-[calc(100vh-4rem)]">
      <CinematicBackground />
      <MasterResultClient />
    </div>
  )
}
