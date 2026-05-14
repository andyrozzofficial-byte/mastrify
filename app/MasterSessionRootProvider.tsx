"use client"

import type { ReactNode } from "react"
import { MasterSessionProvider } from "./master/MasterSessionProvider"

/** Wraps the app shell so `/analyze` and `/master/*` share one mastering session + storage. */
export function MasterSessionRootProvider({ children }: { children: ReactNode }) {
  return <MasterSessionProvider>{children}</MasterSessionProvider>
}
