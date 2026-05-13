import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { FeedbackFab } from '@/features/feedback/feedback-fab';
import { QueryProvider } from '@/shared/providers/query-provider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Edify — Educadores y cuidadores para tu familia',
    template: '%s · Edify',
  },
  description:
    'Conecta con educadores y cuidadores de confianza para la primera infancia. Perfiles verificados, valoraciones y disponibilidad clara.',
  keywords: [
    'primera infancia',
    'educación infantil',
    'babysitter',
    'cuidado infantil',
    'familias',
    'educadores',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/mi-espacio"
      signUpFallbackRedirectUrl="/mi-espacio"
      afterSignOutUrl="/"
    >
      <html lang="es" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
          suppressHydrationWarning
        >
          <QueryProvider>
            {children}
            <FeedbackFab />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
