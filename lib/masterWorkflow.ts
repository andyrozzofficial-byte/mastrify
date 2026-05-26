export type MasterWorkflowPhase = "upload" | "settings" | "master"

export const MASTER_WORKFLOW_LOG = "[master-workflow]" as const

export function logMasterWorkflow(message: string, detail?: Record<string, unknown>) {
  if (detail) console.log(MASTER_WORKFLOW_LOG, message, detail)
  else console.log(MASTER_WORKFLOW_LOG, message)
}

export function isMasterWorkflowPhase(v: unknown): v is MasterWorkflowPhase {
  return v === "upload" || v === "settings" || v === "master"
}
