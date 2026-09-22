import type { MetadataRoute } from "next"
import { SITE_URL } from "../lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/login",
        "/history",
        "/flow",
        "/flow-v2",
        "/master/processing",
        "/master/result",
        "/master/download",
        "/master/settings",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
