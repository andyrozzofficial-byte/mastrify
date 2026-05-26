"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import CinematicPageShell from "../components/cinematic/CinematicPageShell"
import MasterUploadHero from "../components/master/MasterUploadHero"
import { useMasterSession } from "./MasterSessionProvider"

export default function MasterUploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const continuingRef = useRef(false)
  const { file, setFile, handleContinueToSettings, sessionHydrated, currentStep } = useMasterSession()
  const [continuing, setContinuing] = useState(false)

  useEffect(() => {
    if (!sessionHydrated || !file || currentStep < 2) return
    router.replace("/master/settings")
  }, [sessionHydrated, file, currentStep, router])

  function onContinueToSettingsClick() {
    if (continuingRef.current) return

    continuingRef.current = true
    setContinuing(true)
    try {
      const ready = handleContinueToSettings()
      if (!ready) return
      router.push("/master/settings")
    } finally {
      continuingRef.current = false
      setContinuing(false)
    }
  }

  return (
    <CinematicPageShell showBottomFade>
      <MasterUploadHero
        file={file}
        fileInputRef={inputRef}
        onFileSelected={setFile}
        onContinue={onContinueToSettingsClick}
        continueLoading={continuing}
      />
    </CinematicPageShell>
  )
}
