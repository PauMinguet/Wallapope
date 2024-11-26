import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Wallasnipe',
  description: 'Pon los detalles del coche que quieres comprar',
  icons: {
    icon: '/car-icon.svg',
    shortcut: '/car-icon.svg',
    apple: '/car-icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

