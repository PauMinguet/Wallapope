import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Formulario de Compra de Coche',
  description: 'Ingresa los detalles del coche que deseas comprar',
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

