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
  description: "AI mastering for modern artists",
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
            
            {/* LOGO */}
            <Link href="/" className="font-bold text-lg">
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