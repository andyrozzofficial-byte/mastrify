"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import CinematicPageShell from "../components/cinematic/CinematicPageShell"
import { useBetaMasteringGate } from "../components/beta/BetaMasteringGateProvider"
import MasterUploadHero from "../components/master/MasterUploadHero"
import { useMasterSession } from "./MasterSessionProvider"

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { file, setFile } = useMasterSession()
  const { runIfAllowed } = useBetaMasteringGate()

  return (
    <CinematicPageShell showBottomFade>
      <MasterUploadHero
        file={file}
        fileInputRef={inputRef}
        onFileSelected={setFile}
        onContinue={() => runIfAllowed(() => router.push("/master/settings"))}
      />
    </CinematicPageShell>
  )
}
