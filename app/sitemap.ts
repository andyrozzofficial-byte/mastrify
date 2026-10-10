import type { MetadataRoute } from "next"
import { absoluteUrl } from "../lib/seo"

const PUBLIC_PATHS = [
  "/",
  "/master",
  "/analyze",
  "/pricing",
  "/how-it-works",
  "/tools",
  "/help",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PUBLIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }))
}
