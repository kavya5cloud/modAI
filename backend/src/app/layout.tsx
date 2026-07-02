import type { Metadata } from 'next'
import './globals.css'

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'modAI Backend',
  description: 'API backend for modAI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
