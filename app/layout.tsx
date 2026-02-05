import type React from "react"

import type { Metadata } from "next"
import { Figtree, Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: 'BlueClaw - Whale Tracking & On-Chain Signals',
  description: 'The trading signals that actually work. Whale tracking, holder analysis, and on-chain signals delivered instantly to Telegram.',
  icons: {
    icon: '/teleclaw logo.png',
    apple: '/teleclaw logo.png',
  },
  openGraph: {
    title: 'BlueClaw - Whale Tracking & On-Chain Signals',
    description: 'The trading signals that actually work. Whale tracking, holder analysis, and on-chain signals delivered instantly to Telegram.',
    url: 'https://www.blueclawcalls.xyz',
    siteName: 'BlueClaw',
    images: ['/teleclaw logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlueClaw - Whale Tracking & On-Chain Signals',
    description: 'Whale tracking, holder analysis, on-chain signals. Delivered instantly to Telegram.',
    images: ['/teleclaw logo.png'],
    creator: '@BlueClawBot',
  },
  metadataBase: new URL('https://www.blueclawcalls.xyz'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${figtree.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
