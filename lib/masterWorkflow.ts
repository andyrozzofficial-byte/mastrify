export type MasterWorkflowPhase = "upload" | "settings" | "master"

export type MasterWorkflowStep = 1 | 2 | 3

export const MASTER_WORKFLOW_LOCAL_KEY = "masterWorkflow"

/** Serializable workflow snapshot — never includes a File. */
export type MasterWorkflowLocalSnapshot = {
  step: MasterWorkflowStep
  fileName?: string
  fileSize?: number
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
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!isMasterWorkflowStep(parsed.step)) return null

    const snapshot: MasterWorkflowLocalSnapshot = { step: parsed.step }

    if (typeof parsed.fileName === "string" && parsed.fileName.trim()) {
      snapshot.fileName = parsed.fileName.trim()
    } else if (parsed.uploadedFile && typeof parsed.uploadedFile === "object") {
      const legacy = parsed.uploadedFile as { name?: string }
      if (typeof legacy.name === "string" && legacy.name.trim()) {
        snapshot.fileName = legacy.name.trim()
      }
    }

    if (typeof parsed.fileSize === "number" && Number.isFinite(parsed.fileSize)) {
      snapshot.fileSize = parsed.fileSize
    } else if (parsed.uploadedFile && typeof parsed.uploadedFile === "object") {
      const legacy = parsed.uploadedFile as { size?: number }
      if (typeof legacy.size === "number" && Number.isFinite(legacy.size)) {
        snapshot.fileSize = legacy.size
      }
    }

    if (typeof parsed.sessionId === "string" && parsed.sessionId.trim()) {
      snapshot.sessionId = parsed.sessionId.trim()
    }

    return snapshot
  } catch {
    return null
  }
}

export function writeMasterWorkflowLocal(snapshot: MasterWorkflowLocalSnapshot) {
  if (typeof window === "undefined") return
  try {
    const payload: MasterWorkflowLocalSnapshot = { step: snapshot.step }
    if (snapshot.fileName) payload.fileName = snapshot.fileName
    if (typeof snapshot.fileSize === "number" && Number.isFinite(snapshot.fileSize)) {
      payload.fileSize = snapshot.fileSize
    }
    if (snapshot.sessionId) payload.sessionId = snapshot.sessionId
    localStorage.setItem(MASTER_WORKFLOW_LOCAL_KEY, JSON.stringify(payload))
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
