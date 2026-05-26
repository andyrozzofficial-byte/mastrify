export type MasterWorkflowPhase = "upload" | "settings" | "master"

export type MasterWorkflowStep = 1 | 2 | 3

export const MASTER_WORKFLOW_LOCAL_KEY = "masterWorkflow"

export type MasterWorkflowLocalSnapshot = {
  step: MasterWorkflowStep
  uploadedFile?: {
    name: string
    size: number
    lastModified: number
  }
  sessionId?: string
}

export const MASTER_WORKFLOW_LOG = "[master-workflow]" as const

export function logMasterWorkflow(message: string, detail?: Record<string, unknown>) {
  if (detail) console.log(MASTER_WORKFLOW_LOG, message, detail)
  else console.log(MASTER_WORKFLOW_LOG, message)
}

export function isMasterWorkflowPhase(v: unknown): v is MasterWorkflowPhase {
  return v === "upload" || v === "settings" || v === "master"
}

export function stepFromWorkflowPhase(phase: MasterWorkflowPhase): MasterWorkflowStep {
  if (phase === "settings") return 2
  if (phase === "master") return 3
  return 1
}

export function workflowPhaseFromStep(step: number): MasterWorkflowPhase {
  if (step >= 3) return "master"
  if (step >= 2) return "settings"
  return "upload"
}

export function isMasterWorkflowStep(v: unknown): v is MasterWorkflowStep {
  return v === 1 || v === 2 || v === 3
}

export function readMasterWorkflowLocal(): MasterWorkflowLocalSnapshot | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(MASTER_WORKFLOW_LOCAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MasterWorkflowLocalSnapshot
    if (!isMasterWorkflowStep(parsed.step)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeMasterWorkflowLocal(snapshot: MasterWorkflowLocalSnapshot) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(MASTER_WORKFLOW_LOCAL_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore quota */
  }
}

export function clearMasterWorkflowLocal() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(MASTER_WORKFLOW_LOCAL_KEY)
  } catch {
    /* ignore */
  }
}
