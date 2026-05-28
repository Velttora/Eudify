import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, Geist_Mono, Playfair_Display } from 'next/font/google';

import { FeedbackFab } from '@/features/feedback/feedback-fab';
import { SiteFooter } from '@/shared/components/site-footer';
import { QueryProvider } from '@/shared/providers/query-provider';

import { SITE_URL } from '@/shared/config/site';

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Eudify — Educadores y cuidadores para tu familia',
    template: '%s · Eudify',
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
    'Colombia',
    'cuidado infantil Colombia',
    'clases particulares',
    'apoyo escolar',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: SITE_URL,
    siteName: 'Eudify',
    title: 'Eudify — Educadores y cuidadores para tu familia',
    description:
      'Conecta con educadores y cuidadores de confianza para la primera infancia. Perfiles verificados, valoraciones y disponibilidad clara.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Eudify — Educadores y cuidadores para tu familia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eudify — Educadores y cuidadores para tu familia',
    description:
      'Conecta con educadores y cuidadores de confianza para la primera infancia.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
          className={`${dmSans.variable} ${geistMono.variable} ${playfair.variable} flex min-h-screen flex-col bg-background font-sans text-foreground antialiased`}
          suppressHydrationWarning
        >
          <QueryProvider>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <SiteFooter />
            <FeedbackFab />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
