import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; 
import { GeistMono } from 'geist/font/mono'; 
import './globals.css';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/layout/theme-provider'; // Import ThemeProvider

// Initialize fonts by calling the imported functions
// Place initialization outside the component function
const geistSans = GeistSans; 
const geistMono = GeistMono; 


export const metadata: Metadata = {
  title: 'BarberEase',
  description: 'Effortless appointment booking for barbers and clients.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add suppressHydrationWarning to html tag if necessary for specific libraries causing mismatches
    <html lang="en" suppressHydrationWarning={true} className={cn(geistSans.variable, geistMono.variable)}>
      <body
        suppressHydrationWarning={true} // Add suppression here as well
        className={cn(
          'min-h-screen bg-background font-sans antialiased flex flex-col'
          // Font family is now set globally via html tag and CSS variables
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
