import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Correct import path from subpath
import { GeistMono } from 'geist/font/mono';   // Correct import path from subpath
import './globals.css';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

// Initialize fonts by calling the imported functions
const geistSans = GeistSans({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = GeistMono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
    <html lang="en" suppressHydrationWarning>
      {/* Add font variables to the html tag for global availability */}
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased flex flex-col',
          geistSans.variable, // Use the .variable property
          geistMono.variable   // Use the .variable property
        )}
      >
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
