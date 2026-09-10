const PREFIX = "mastrify-beta-pulse-"

export function readPulseSent(stage: "analysis" | "preview"): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(`${PREFIX}${stage}`) === "1"
  } catch {
    return false
  }
}

export function writePulseSent(stage: "analysis" | "preview"): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(`${PREFIX}${stage}`, "1")
  } catch {
    /* ignore */
  }
}
