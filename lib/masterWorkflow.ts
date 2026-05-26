export type MasterWorkflowPhase = "upload" | "settings" | "master"

export type MasterWorkflowStep = 1 | 2 | 3

export type MasterState = {
  step: MasterWorkflowStep
  file: File | null
}

export const INITIAL_MASTER_STATE: MasterState = { step: 1, file: null }

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
