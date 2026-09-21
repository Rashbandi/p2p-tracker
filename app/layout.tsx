import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'P2P Tracker — Infinity Changes',
  description: 'Control de operaciones P2P · USDT · LATAM',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
