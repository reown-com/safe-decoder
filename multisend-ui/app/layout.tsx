import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeWallet Multisend Parser',
  description: 'A tool to decode Safe Wallet multisend transactions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen p-4 md:p-8">
        <main className="max-w-6xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
} 