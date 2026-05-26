"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import CinematicPageShell from "../components/cinematic/CinematicPageShell"
import { useBetaMasteringGate } from "../components/beta/BetaMasteringGateProvider"
import MasterUploadHero from "../components/master/MasterUploadHero"
import { useMasterSession } from "./MasterSessionProvider"

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const continuingRef = useRef(false)
  const { file, setFile, continueToSettings, persistSessionSnapshot } = useMasterSession()
  const { isBeta, runIfAllowed } = useBetaMasteringGate()
  const [continuing, setContinuing] = useState(false)

  function handleContinue() {
    if (!file || continuingRef.current) return

    const advance = () => {
      continuingRef.current = true
      setContinuing(true)
      try {
        if (!continueToSettings()) return
        persistSessionSnapshot()
        router.push("/master/settings")
      } finally {
        continuingRef.current = false
        setContinuing(false)
      }
    }

    if (isBeta) {
      advance()
      return
    }

    runIfAllowed(advance)
  }

  return (
    <CinematicPageShell showBottomFade>
      <MasterUploadHero
        file={file}
        fileInputRef={inputRef}
        onFileSelected={setFile}
        onContinue={handleContinue}
        continueLoading={continuing}
      />
    </CinematicPageShell>
  )
}
