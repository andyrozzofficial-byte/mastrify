/** Read duration in seconds from a local audio File (browser only). */
export function readAudioDurationSec(file: File): Promise<number | null> {
  if (typeof window === "undefined") return Promise.resolve(null)

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()

    const finish = (value: number | null) => {
      audio.src = ""
      URL.revokeObjectURL(url)
      resolve(value)
    }

    audio.addEventListener(
      "loadedmetadata",
      () => {
        const d = audio.duration
        if (typeof d === "number" && Number.isFinite(d) && d > 0) {
          finish(Number(d.toFixed(2)))
        } else {
          finish(null)
        }
      },
      { once: true }
    )

    audio.addEventListener("error", () => finish(null), { once: true })
    audio.preload = "metadata"
    audio.src = url
  })
}
