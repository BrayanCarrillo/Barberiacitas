"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react'; 
import { ThemeToggle } from './theme-toggle'; // Import ThemeToggle

export function Header() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false); 

  useEffect(() => {
    setIsClient(true); 
  }, []);

  const navItems = [
    { href: '/', label: 'Reserva Cliente' }, 
    { href: '/barber', label: 'Panel del Barbero' }, 
  ];

  return (
    <header className="bg-card border-b sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="text-primary">BarberEase</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-2 sm:gap-4">
            {isClient ? (
              navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))
            ) : (
              // Render placeholders during SSR/initial render to prevent hydration mismatch
              navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={'ghost'} // Default variant for SSR
                  size="sm"
                  asChild
                  aria-hidden="true" // Hide from assistive tech initially
                  className="invisible" // Hide visually but maintain layout space
                >
                  <Link href={item.href} tabIndex={-1}>{item.label}</Link>
                </Button>
              ))
            )}
          </nav>
          {isClient && <ThemeToggle />} 
        </div>
      </div>
    </header>
  );
}
