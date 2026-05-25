import type { MetadataRoute } from 'next';

const siteUrl = 'https://edifyacademy.co';

async function fetchEducatorIds(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) return [];
  try {
    const res = await fetch(`${base}/v1/discover/providers?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ id?: string; providerProfileId?: string }>;
    return data
      .map((p) => p.providerProfileId ?? p.id)
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/explorar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  const educatorIds = await fetchEducatorIds();
  const educatorRoutes: MetadataRoute.Sitemap = educatorIds.map((id) => ({
    url: `${siteUrl}/educadores/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...educatorRoutes];
}
