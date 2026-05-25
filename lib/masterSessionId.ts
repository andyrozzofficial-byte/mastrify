/** Unique ID per mastering run (upload → settings → processing → result). */
export function createMasterSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}
