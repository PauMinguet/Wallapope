import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import UserSync from '@/components/UserSync'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChollosCarFinder',
  description: 'Encuentra los mejores chollos de coches',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <ClerkProvider>
        <body className={inter.className}>
          <UserSync />
          {children}
        </body>
      </ClerkProvider>
    </html>
  )
}
