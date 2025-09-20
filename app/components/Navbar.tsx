'use client';

import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  return (
    <nav className="bg-gray-200 dark:bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-4">
          <Link href="/dashboard" className="text-gray-800 dark:text-gray-200">Dashboard</Link>
          <Link href="/start-sit" className="text-gray-800 dark:text-gray-200">Start-Sit</Link>
          <Link href="/waivers" className="text-gray-800 dark:text-gray-200">Waivers</Link>
          <Link href="/trades" className="text-gray-800 dark:text-gray-200">Trades</Link>
          <Link href="/keepers" className="text-gray-800 dark:text-gray-200">Keepers</Link>
          <Link href="/chat" className="text-gray-800 dark:text-gray-200">Chat</Link>
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}