import type { ChangeEvent } from "react"

/**
 * iOS Safari often fails to fire `change` on file inputs with `display: none` / `hidden`.
 * Pair with a visible <label htmlFor={id}> — do not overlay inputs on other buttons.
 */
export const OFF_SCREEN_FILE_INPUT_CLASS =
  "pointer-events-none fixed left-0 top-0 -z-10 h-px w-px opacity-[0.01]"

/** @deprecated Prefer OFF_SCREEN_FILE_INPUT_CLASS + label htmlFor */
export const IOS_SAFE_FILE_INPUT_CLASS =
  "absolute inset-0 z-20 h-full w-full cursor-pointer opacity-[0.001] [font-size:16px]"

export function bindIosFileInputHandlers(
  onPick: (file: File | undefined, input: HTMLInputElement | null) => void
) {
  let lastKey = ""

  const handler = (e: ChangeEvent<HTMLInputElement>) => {
    const candidate = e.target.files?.[0]
    if (!candidate) return
    const key = `${candidate.name}:${candidate.size}:${candidate.lastModified}`
    if (key === lastKey) return
    lastKey = key
    onPick(candidate, e.target)
  }

  return { onChange: handler, onInput: handler }
}
