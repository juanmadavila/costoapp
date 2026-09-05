import { Analytics } from '@vercel/analytics/next'
import { DM_Serif_Display, Geist, Geist_Mono } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dm-serif' })

export const metadata: Metadata = {
  title: 'CostoApp · Control de gastos',
  description: 'Gestiona tus gastos profesionales y personales con claridad.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: '/costoapp-receipt.svg',
    apple: '/costoapp-receipt.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'CostoApp',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#10B981',
  viewportFit: 'cover',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="bg-background">
      <body className={`${geist.variable} ${geistMono.variable} ${dmSerif.variable} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
