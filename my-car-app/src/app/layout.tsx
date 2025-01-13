import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "Wallapoper",
  description: "Pero que malditos tenis",
  icons: {
    icon: { url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="%2306B6D4"/><path transform="scale(0.75) translate(4,4)" fill="black" d="M2 14.803v6.447c0 .414.336.75.75.75h1.614a.75.75 0 0 0 .74-.627L5.5 19h13l.395 2.373a.75.75 0 0 0 .74.627h1.615a.75.75 0 0 0 .75-.75v-6.447a5.954 5.954 0 0 0-1-3.303l-.78-1.17a1.994 1.994 0 0 1-.178-.33h.994a.75.75 0 0 0 .671-.415l.25-.5A.75.75 0 0 0 21.287 8H19.6l-.31-1.546a2.5 2.5 0 0 0-1.885-1.944C15.943 4.17 14.141 4 12 4c-2.142 0-3.943.17-5.405.51a2.5 2.5 0 0 0-1.886 1.944L4.399 8H2.714a.75.75 0 0 0-.67 1.085l.25.5a.75.75 0 0 0 .67.415h.995a1.999 1.999 0 0 1-.178.33L3 11.5c-.652.978-1 2.127-1 3.303zm15.961-4.799a4 4 0 0 0 .34.997H5.699c.157-.315.271-.65.34-.997l.632-3.157a.5.5 0 0 1 .377-.39C8.346 6.157 10 6 12 6c2 0 3.654.156 4.952.458a.5.5 0 0 1 .378.389l.631 3.157zM5.5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20 14.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>' }
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Wallapoper',
    description: 'Pero que malditos tenis',
    images: [
      {
        url: '/22-og.png',
        width: 1200,
        height: 630,
        alt: '22 Cars'
      }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
