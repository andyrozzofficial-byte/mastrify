"use client"

import { useEffect, useRef } from "react"
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

  useEffect(() => {
    console.log("[master-workflow] MasterWorkflowPage step:", masterState.step)
  }, [masterState.step])

  if (masterState.step === 1) {
    return <UploadStepView masterState={masterState} inputRef={inputRef} handleMasterUpload={handleMasterUpload} handleContinueToSettings={handleContinueToSettings} />
  }

  if (masterState.step === 2) {
    return (
      <SettingsStepView
        file={masterState.file}
        onContinue={handleContinueToMaster}
        onBack={handleBackToUpload}
      />
    )
  }

  return <MasterProcessingPage />
}

function UploadStepView({
  masterState,
  inputRef,
  handleMasterUpload,
  handleContinueToSettings,
}: {
  masterState: { step: number; file: File | null }
  inputRef: React.RefObject<HTMLInputElement | null>
  handleMasterUpload: (file: File) => void
  handleContinueToSettings: () => void
}) {
  useEffect(() => {
    console.log("[master-workflow] UPLOAD STEP MOUNTED")
  }, [])

  useEffect(() => {
    console.log("[master-workflow] UPLOAD FILE:", masterState.file?.name ?? null)
  }, [masterState.file])

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

function SettingsStepView({
  file,
  onContinue,
  onBack,
}: {
  file: File | null
  onContinue: () => void
  onBack: () => void
}) {
  useEffect(() => {
    console.log("[master-workflow] SETTINGS MOUNTED")
  }, [])

  useEffect(() => {
    console.log("[master-workflow] UPLOAD FILE:", file?.name ?? null)
  }, [file])

  return <MasterSettingsStep file={file} onContinue={onContinue} onBack={onBack} />
}
