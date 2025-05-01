import type { Metadata } from 'next';
// Corrected import for Geist fonts
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

// Font objects are directly used, not called as functions.
// Their properties like `.variable` are accessed later.
const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'BarberEase',
  description: 'Effortless Appointment Scheduling',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply font variables to the html tag for global availability
    <html
      lang="en"
      suppressHydrationWarning
      // Use the .variable property from the font objects
      className={cn(geistSans.variable, geistMono.variable)}
    >
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased flex flex-col'
          // Font family is now set globally via html tag and CSS variables
        )}
      >
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
