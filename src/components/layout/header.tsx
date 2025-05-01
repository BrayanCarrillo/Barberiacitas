"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Client Booking' },
    { href: '/barber', label: 'Barber Dashboard' },
  ];

  return (
    <header className="bg-card border-b sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="text-primary">BarberEase</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
