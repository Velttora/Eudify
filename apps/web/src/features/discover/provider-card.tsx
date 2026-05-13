import Image from 'next/image';
import Link from 'next/link';

export type ProviderCardData = {
  id: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
  kinds: string[];
  isVerified: boolean;
  averageRating: number | null;
  reviewCount: number;
  isAvailable: boolean;
  availabilityText: string | null;
};

const kindLabel: Record<string, string> = {
  TEACHER: 'Profesor',
  BABYSITTER: 'Cuidador/a',
};

export function ProviderCard({ provider }: { provider: ProviderCardData }) {
  const rating =
    provider.averageRating != null
      ? provider.averageRating.toFixed(1)
      : 'Sin valorar';
  const kinds = (provider.kinds ?? [])
    .map((k) => kindLabel[k] ?? k)
    .join(' · ');

  return (
    <Link
      href={`/educadores/${provider.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/35 hover:shadow-md"
    >
      <article className="flex h-full flex-col">
        <div className="relative h-40 w-full bg-linear-to-br from-accent-soft/80 to-muted">
          {provider.photoUrl ? (
            <Image
              src={provider.photoUrl}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-semibold text-primary/35">
              {provider.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
              provider.isAvailable
                ? 'bg-primary text-white'
                : 'bg-muted-foreground text-white'
            }`}
          >
            {provider.isAvailable ? 'Disponible' : 'No disponible'}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
                {provider.displayName}
              </h3>
              {provider.isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                  <span aria-hidden>✓</span>
                  Verificado
                </span>
              ) : null}
            </div>
            {provider.headline ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {provider.headline}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {kinds ? (
              <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
                {kinds}
              </span>
            ) : null}
            <span className="rounded-full bg-accent-soft/50 px-2.5 py-1 font-medium text-primary ring-1 ring-accent/25">
              ★ {rating}
              {provider.reviewCount > 0
                ? ` (${provider.reviewCount})`
                : ''}
            </span>
          </div>
          {provider.availabilityText ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {provider.availabilityText}
            </p>
          ) : null}
          {provider.bio ? (
            <p className="line-clamp-3 text-sm text-muted-foreground/90">
              {provider.bio}
            </p>
          ) : null}
          <div className="mt-auto border-t border-border pt-3">
            <span className="text-sm font-medium text-muted-foreground transition group-hover:text-primary">
              Ver perfil completo
              <span aria-hidden className="ml-1 inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
