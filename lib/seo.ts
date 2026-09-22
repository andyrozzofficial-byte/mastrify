import type { Metadata } from "next"
import { MASTER_PRICE_LABEL, MASTER_PRICE_USD } from "./pricing"

export const SITE_NAME = "Mastrify"
export const SITE_URL = "https://www.mastrify.com"
export const DEFAULT_OG_IMAGE = "/og-image.png"

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

type PageMetadataInput = {
  title: string
  description: string
  path: string
  ogTitle?: string
  keywords?: string[]
  noIndex?: boolean
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const canonical = input.path === "/" ? "/" : input.path
  const ogTitle = input.ogTitle ?? input.title

  return {
    title: input.title,
    description: input.description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: {
      canonical: absoluteUrl(canonical),
    },
    openGraph: {
      title: ogTitle,
      description: input.description,
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — AI mastering online`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: input.description,
      images: [DEFAULT_OG_IMAGE],
    },
    ...(input.noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/brand-mark.svg"),
    sameAs: [
      "https://www.instagram.com/mastrify.app",
      "https://www.tiktok.com/@mastrify.app",
    ],
  }
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: "AI mastering online for release-ready music exports.",
  }
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/master"),
    description:
      "Online AI mastering for musicians and producers. Upload a mix and download a streaming-ready WAV master.",
    offers: {
      "@type": "Offer",
      price: MASTER_PRICE_USD.toFixed(2),
      priceCurrency: "USD",
      description: `Pay per master export — ${MASTER_PRICE_LABEL}`,
    },
  }
}

export type FaqItem = {
  question: string
  answer: string
}

export function faqPageJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}
