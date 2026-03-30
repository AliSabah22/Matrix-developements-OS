import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Matrix Developements OS',
  description: 'Operating system for high-end automotive service shops',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
