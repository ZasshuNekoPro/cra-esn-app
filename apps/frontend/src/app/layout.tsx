import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { QueryProvider } from './QueryProvider';

export const metadata: Metadata = {
  title: 'ESN CRA App',
  description: 'Gestion CRA & suivi de projets pour salariés ESN',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
