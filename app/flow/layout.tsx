import type { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL("https://mastrify.com"),
  title: {
    absolute: "Mastrify Flow",
  },
  description: "Online mastering for release-ready music. Pay only when you export.",
  alternates: {
    canonical: "/flow",
  },
  openGraph: {
    title: "Mastrify Flow",
    description: "Online mastering for release-ready music. Pay only when you export.",
    url: "https://mastrify.com/flow",
    siteName: "Mastrify",
    images: [
      {
        url: "/og-flow.svg",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mastrify Flow",
    description: "Online mastering for release-ready music. Pay only when you export.",
    images: ["/og-flow.svg"],
  },
}

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return children
}

