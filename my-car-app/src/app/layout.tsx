import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import UserSync from '@/components/UserSync'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChollosCars',
  description: 'Encuentra los mejores chollos de coches',
  icons: [
    { rel: 'icon', url: '/logo.png' },
    { rel: 'apple-touch-icon', url: '/logo.png' }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider appearance={{
      baseTheme: dark,
      variables: {
        colorBackground: '#111111',
        colorInputBackground: 'rgba(255,255,255,0.05)',
        colorInputText: 'white',
        colorTextOnPrimaryBackground: 'white',
        colorPrimary: '#4169E1',
      }
    }}>
      <html lang="es" suppressHydrationWarning>
        <body className={inter.className} suppressHydrationWarning>
          <UserSync />
          {children}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  )
}
