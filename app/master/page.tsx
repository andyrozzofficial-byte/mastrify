"use client"

import { useRef, useState } from "react"
import CinematicPageShell from "../components/cinematic/CinematicPageShell"
import MasterSettingsStep from "../components/master/MasterSettingsStep"
import MasterUploadHero from "../components/master/MasterUploadHero"
import { useMasterSession } from "./MasterSessionProvider"

export default function MasterUploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const continuingRef = useRef(false)
  const {
    getActiveUploadFile,
    setFile,
    handleContinueToSettings,
    masterWorkflow,
    sessionHydrated,
  } = useMasterSession()
  const file = getActiveUploadFile()
  const [continuing, setContinuing] = useState(false)

  function onContinueToSettingsClick() {
    if (continuingRef.current) return

    continuingRef.current = true
    setContinuing(true)
    try {
      handleContinueToSettings()
    } finally {
      continuingRef.current = false
      setContinuing(false)
    }
  }

  if (!sessionHydrated) {
    return (
      <CinematicPageShell showBottomFade>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
          <p className="text-sm text-white/50">Restoring session…</p>
        </div>
      </CinematicPageShell>
    )
  }

  if (masterWorkflow.step >= 2) {
    return <MasterSettingsStep />
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
