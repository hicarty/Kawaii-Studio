import "@/lib/iterator-polyfill"
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })
const _instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400" })

export const metadata: Metadata = {
  title: "Kawaii Studio - Djent x DnB Fusion",
  description:
    "Professional MIDI production app for creating djent metal and drum & bass fusion tracks for Japanese film soundtracks. Powered by JUCE WebAssembly.",
}

export const viewport: Viewport = {
  themeColor: "#1a1030",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}

