import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { KeepAlive } from '@/components/KeepAlive'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PPE Compliance System',
  description: 'Real-time Personal Protective Equipment monitoring and compliance system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <KeepAlive />
        {children}
      </body>
    </html>
  )
}
