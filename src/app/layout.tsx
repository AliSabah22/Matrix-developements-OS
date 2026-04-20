import type { Metadata } from 'next'
import LayoutWrapper from '@/components/LayoutWrapper'
import './globals.css'

export const metadata: Metadata = {
  title: 'Matrix Developments OS',
  description: 'Multi-agent operating system for Matrix Developments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}
