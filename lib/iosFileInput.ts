import type { ChangeEvent } from "react"

/**
 * iOS Safari often fails to fire `change` on file inputs with `display: none` / `hidden`.
 * Overlay the input on the visible control instead (opacity ~0, full hit target).
 */
export const IOS_SAFE_FILE_INPUT_CLASS =
  "absolute inset-0 z-20 h-full w-full cursor-pointer opacity-[0.001] [font-size:16px]"

export function bindIosFileInputHandlers(
  onPick: (file: File | undefined, input: HTMLInputElement | null) => void
) {
  const handler = (e: ChangeEvent<HTMLInputElement>) => {
    onPick(e.target.files?.[0], e.target)
  }
  return { onChange: handler, onInput: handler }
}
