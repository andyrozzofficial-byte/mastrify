const DEFAULT_TIMEOUT_MS = 10_000

export class FetchTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = "FetchTimeoutError"
    this.timeoutMs = timeoutMs
  }
}

export type FetchJsonResult<T> = {
  res: Response
  json: T | null
}

/**
 * fetch() with AbortSignal timeout. Clears the timer when the request settles.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const { timeoutMs: _omit, signal: externalSignal, ...rest } = init ?? {}

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true })
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchTimeoutError(timeoutMs)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchJsonWithTimeout<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<FetchJsonResult<T>> {
  const res = await fetchWithTimeout(input, init)
  const json = (await res.json().catch(() => null)) as T | null
  return { res, json }
}

export function messageFromFetchError(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof FetchTimeoutError) {
    return "The request took too long. Please check your connection and try again."
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
