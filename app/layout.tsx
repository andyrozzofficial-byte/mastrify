import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Link from "next/link"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Mastrify",
  description: "AI-powered mix & mastering. Release-ready in seconds.",

  openGraph: {
    title: "Mastrify",
    description: "AI-powered mix & mastering. Release-ready in seconds.",
    url: "https://mastrify.com",
    siteName: "Mastrify",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-black text-white`}
      >

        {/* NAVBAR (VISAS ENDAST PÅ /app) */}
        {typeof window !== "undefined" && window.location.pathname === "/app" && (
          <nav className="w-full flex justify-between items-center px-6 py-4 border-b border-white/10">
            
            <Link
  href="/"
  className="font-bold text-lg bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent"
>
  Mastrify
</Link>

          </nav>
        )}

        {/* PAGE CONTENT */}
        <main>
          {children}
        </main>

      </body>
    </html>
  )
}