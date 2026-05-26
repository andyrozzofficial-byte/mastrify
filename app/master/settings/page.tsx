"use client"

import MasterSettingsStep from "../../components/master/MasterSettingsStep"
import { useMasterSession } from "../MasterSessionProvider"

/** Settings UI — shares `/master` session state; no navigation so the in-memory File is preserved. */
export default function MasterSettingsPage() {
  const { file, sessionHydrated } = useMasterSession()

  if (!sessionHydrated) {
    return (
      <div className="relative flex min-h-[40vh] items-center justify-center text-white/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
      </div>
    )
  }

  return <MasterSettingsStep file={file} />
}
