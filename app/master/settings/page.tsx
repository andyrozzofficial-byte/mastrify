"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMasterSession } from "../MasterSessionProvider"

/** Legacy route — workflow steps 1–2 live on `/master` so the upload File is not lost on navigation. */
export default function MasterSettingsPage() {
  const router = useRouter()
  const { sessionHydrated, masterWorkflow, getActiveUploadFile, handleContinueToSettings } = useMasterSession()

  useEffect(() => {
    if (!sessionHydrated) return
    if (masterWorkflow.step < 2 && getActiveUploadFile()) {
      handleContinueToSettings()
    }
    router.replace("/master")
  }, [sessionHydrated, masterWorkflow.step, getActiveUploadFile, handleContinueToSettings, router])

  return (
    <div className="relative flex min-h-[40vh] items-center justify-center text-white/50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
    </div>
  )
}
