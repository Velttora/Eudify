import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, Geist_Mono, Playfair_Display } from 'next/font/google';

import { FeedbackFab } from '@/features/feedback/feedback-fab';
import { QueryProvider } from '@/shared/providers/query-provider';

import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
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
          className={`${dmSans.variable} ${geistMono.variable} ${playfair.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
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
