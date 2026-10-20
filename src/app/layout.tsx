import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EyeNova POS — Optical Retail Register & Inventory',
  description: 'Minimalist high-speed optical register and inventory management system.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full antialiased ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 font-sans selection:bg-stone-200 selection:text-stone-900">
        {children}
      </body>
    </html>
  );
}
