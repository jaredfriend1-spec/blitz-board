import './globals.css'
import React from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-white antialiased selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  )
}