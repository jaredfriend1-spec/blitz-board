import './globals.css'
import BottomNav from '@/components/BottomNav'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Blitz Board',
  description: 'Golf tournament scoring — live scorer, payouts, skins',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Blitz Board',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Blitz Board"/>
        <link rel="apple-touch-icon" href="/icon-180.png"/>
      </head>
      <body className="bg-black text-white antialiased pb-20">
        {children}
        <BottomNav />
      </body>
    </html>
  )
}