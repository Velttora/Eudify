import type { Metadata } from 'next';

import { EducatorProfilePage } from '@/features/educadores/educator-profile-page';

type JsonLdPerson = {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;
  description?: string;
  image?: string;
  url: string;
  address?: { '@type': 'PostalAddress'; addressLocality: string; addressCountry: string };
  knowsAbout?: string[];
};

const siteUrl = 'https://edifyacademy.co';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ providerProfileId: string }>;
}): Promise<Metadata> {
  const { providerProfileId } = await params;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/educadores/${providerProfileId}`;

  if (!base) {
    return { title: 'Educador | Edify', alternates: { canonical: canonicalUrl } };
  }

  try {
    const res = await fetch(
      `${base}/v1/discover/providers/${providerProfileId}`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) {
      return { title: 'Educador | Edify', alternates: { canonical: canonicalUrl } };
    }
    const p = (await res.json()) as {
      fullName?: string | null;
      bio?: string | null;
      city?: string | null;
      photoUrl?: string | null;
    };
    const name = p.fullName?.trim() || 'Educador';
    const cityPart = p.city ? ` · ${p.city}` : '';
    const description = p.bio
      ? p.bio.slice(0, 155)
      : `Perfil de ${name} en Edify${cityPart}.`;

    return {
      title: `${name} | Edify`,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: `${name} · Edify`,
        description,
        url: canonicalUrl,
        type: 'profile',
        images: p.photoUrl
          ? [{ url: p.photoUrl, width: 400, height: 400, alt: name }]
          : [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'Edify' }],
      },
      twitter: {
        card: 'summary',
        title: `${name} · Edify`,
        description,
        images: p.photoUrl ? [p.photoUrl] : [`${siteUrl}/og-image.png`],
      },
    };
  } catch {
    return { title: 'Educador | Edify', alternates: { canonical: canonicalUrl } };
  }
}

async function getEducatorJsonLd(providerProfileId: string): Promise<JsonLdPerson | null> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) return null;
  try {
    const res = await fetch(
      `${base}/v1/discover/providers/${providerProfileId}`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return null;
    const p = (await res.json()) as {
      fullName?: string | null;
      bio?: string | null;
      city?: string | null;
      photoUrl?: string | null;
      focusAreas?: string[];
    };
    const name = p.fullName?.trim();
    if (!name) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      description: p.bio ?? undefined,
      image: p.photoUrl ?? undefined,
      address: p.city ? { '@type': 'PostalAddress', addressLocality: p.city, addressCountry: 'CO' } : undefined,
      knowsAbout: p.focusAreas?.length ? p.focusAreas : undefined,
      url: `${siteUrl}/educadores/${providerProfileId}`,
    };
  } catch {
    return null;
  }
}

export default async function EducadorProfileRoute({
  params,
}: {
  params: Promise<{ providerProfileId: string }>;
}) {
  const { providerProfileId } = await params;
  const jsonLd = await getEducatorJsonLd(providerProfileId);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EducatorProfilePage providerProfileId={providerProfileId} />
    </>
  );
}
