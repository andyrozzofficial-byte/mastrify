import type { MetadataRoute } from "next"
import { absoluteUrl } from "../lib/seo"

const PUBLIC_PATHS = [
  "/",
  "/ai-mastering",
  "/master",
  "/analyze",
  "/pricing",
  "/how-it-works",
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
    changeFrequency: path === "/" || path === "/ai-mastering" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/ai-mastering" ? 0.95 : 0.7,
  }))
}
