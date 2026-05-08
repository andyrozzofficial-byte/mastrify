import type { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL("https://mastrify.com"),
  title: {
    absolute: "Mastrify Flow",
  },
  description: "AI-powered mix & mastering. Release-ready in seconds.",
  alternates: {
    canonical: "/flow",
  },
  openGraph: {
    title: "Mastrify Flow",
    description: "AI-powered mix & mastering. Release-ready in seconds.",
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
    description: "AI-powered mix & mastering. Release-ready in seconds.",
    images: ["/og-flow.svg"],
  },
}

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return children
}

