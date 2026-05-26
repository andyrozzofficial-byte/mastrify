/** Dev-only timing helpers (dashboard / beta load profiling). */

export const PERF_DEBUG =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_MASTRIFY_PERF === "1" ||
  process.env.MASTRIFY_PERF === "1"

export function perfTimeStart(label: string): void {
  if (PERF_DEBUG) console.time(label)
}

export function perfTimeEnd(label: string): void {
  if (PERF_DEBUG) console.timeEnd(label)
}

export async function perfTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  perfTimeStart(label)
  try {
    return await fn()
  } finally {
    perfTimeEnd(label)
  }
}
