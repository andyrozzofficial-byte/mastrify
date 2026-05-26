"use client"

import { useRef } from "react"
import CinematicPageShell from "../cinematic/CinematicPageShell"
import MasterProcessingPage from "../../master/processing/page"
import MasterSettingsStep from "./MasterSettingsStep"
import MasterUploadHero from "./MasterUploadHero"
import { useMasterSession } from "../../master/MasterSessionProvider"

export default function MasterWorkflowPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    masterState,
    handleMasterUpload,
    handleContinueToSettings,
    handleContinueToMaster,
    handleBackToUpload,
  } = useMasterSession()

  if (masterState.step === 1) {
    return (
      <CinematicPageShell showBottomFade>
        <MasterUploadHero
          file={masterState.file}
          stepRailPhase="upload"
          fileInputRef={inputRef}
          onFileSelected={handleMasterUpload}
          onContinue={handleContinueToSettings}
        />
      </CinematicPageShell>
    )
  }

  if (masterState.step === 2) {
    return (
      <MasterSettingsStep
        file={masterState.file}
        onContinue={handleContinueToMaster}
        onBack={handleBackToUpload}
      />
    )
  }

  return <MasterProcessingPage />
}
