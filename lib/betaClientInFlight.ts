/**
 * Client-only: coalesce concurrent beta metric API calls (double-click, 2 tabs, rapid refresh).
 * Server remains source of truth; this only dedupes in-flight fetches per key.
 */

const completeBySession = new Map<string, Promise<unknown>>()
const downloadByKey = new Map<string, Promise<unknown>>()

export function coalesceBetaMasterComplete<T>(
  sessionId: string,
  run: () => Promise<T>,
): Promise<T> {
  const key = sessionId.trim()
  if (!key) return run()
  const existing = completeBySession.get(key)
  if (existing) return existing
  const promise = run().finally(() => {
    if (completeBySession.get(key) === promise) completeBySession.delete(key)
  })
  completeBySession.set(key, promise)
  return promise as Promise<T>
}

export function coalesceBetaMasterDownload<T>(
  dedupeKey: string,
  run: () => Promise<T>,
): Promise<T> {
  const key = dedupeKey.trim()
  if (!key) return run()
  const existing = downloadByKey.get(key)
  if (existing) return existing
  const promise = run().finally(() => {
    if (downloadByKey.get(key) === promise) downloadByKey.delete(key)
  })
  downloadByKey.set(key, promise)
  return promise as Promise<T>
}
