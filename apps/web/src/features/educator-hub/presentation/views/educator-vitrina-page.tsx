'use client';

import type {
  EducatorBadge,
  EducatorProfile,
  EducatorReview,
  ProfileCompletionItem,
} from '@/features/educator-hub/domain/types';
import {
  formatAgeBands,
  formatMoneyMinor,
  formatServiceMode,
} from '@/features/educator-hub/application/educator-format';

import type { AvailabilityBlockRow } from '@/features/availability/api/availability-api';
import { EducatorAvailabilityCalendar } from '@/features/educadores/educator-availability-calendar';
import Link from 'next/link';
import type { ProviderKind } from '@/shared/types/bootstrap';
import type { ProviderRateApiRow } from '@/features/provider-rates/api/provider-rates-api';
import { buttonStyles } from '@/shared/components/ui/button';

const kindLabel: Record<string, string> = {
  TEACHER: 'Profesor particular',
  BABYSITTER: 'Cuidador/a infantil',
};

const modeLabel: Record<string, string> = {
  IN_PERSON: 'Presencial',
  ONLINE: 'En línea',
  HYBRID: 'Híbrido',
};

function rateUnitLabel(unit: string): string {
  if (unit === 'HOUR') return 'por hora';
  if (unit === 'SESSION') return 'por sesión';
  if (unit === 'DAY') return 'por día';
  return unit;
}

export function EducatorVitrinaPage({
  profile,
  reviews,
  badges,
  completion,
  publicProfileId,
  kinds,
  rates,
  availabilityBlocks,
  isProfileCompleted,
}: {
  profile: EducatorProfile;
  reviews: EducatorReview[];
  badges: EducatorBadge[];
  completion: { scorePercent: number; items: ProfileCompletionItem[] };
  publicProfileId: string | null;
  kinds: ProviderKind[];
  rates: ProviderRateApiRow[];
  availabilityBlocks: AvailabilityBlockRow[];
  isProfileCompleted: boolean;
}) {
  const pending = completion.items.filter((i) => !i.done);
  const ratingLabel =
    typeof profile.averageRating === 'number' && !Number.isNaN(profile.averageRating)
      ? profile.averageRating.toFixed(1)
      : '—';
  const calendarBlocks = availabilityBlocks.map((b) => ({
    id: b.id,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    isAllDay: b.isAllDay,
    timezone: b.timezone,
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Vitrina pública</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Misma información que verán las familias en tu ficha pública: servicios, trayectoria,
            tarifas y ventanas de agenda (alineado con{' '}
            {publicProfileId ? (
              <Link
                href={`/educadores/${publicProfileId}`}
                className="font-semibold text-primary-soft underline-offset-2 hover:underline"
              >
                tu URL pública
              </Link>
            ) : (
              'tu URL pública'
            )}
            ).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link href="/profile/provider" className={buttonStyles('secondary', 'rounded-xl text-center')}>
            Editar perfil real
          </Link>
          {publicProfileId ? (
            <Link
              href={`/educadores/${publicProfileId}`}
              className="text-sm font-medium text-primary-soft underline-offset-2 hover:underline"
            >
              Abrir URL pública
            </Link>
          ) : null}
        </div>
      </header>

      {!isProfileCompleted || !profile.isAvailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {!isProfileCompleted ? (
            <p>
              <span className="font-semibold">Perfil incompleto.</span> Hasta que completes el
              onboarding, la ficha pública no se mostrará en el catálogo (las familias verán error al
              abrir el enlace).
            </p>
          ) : (
            <p>
              <span className="font-semibold">Marcado como no disponible.</span> Activa la
              disponibilidad en Mi perfil si quieres aparecer en explorar y recibir solicitudes.
            </p>
          )}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="relative min-h-[280px] bg-primary p-8 text-white lg:min-h-[360px]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-white/20 bg-white/10">
                {profile.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm opacity-70">Sin foto</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80">Educador en Edify</p>
                <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{profile.fullName}</h2>
                {profile.city ? (
                  <p className="mt-2 text-base text-white/90">{profile.city}</p>
                ) : null}
                <p className="mt-2 text-base text-white/90">{profile.headline}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {kinds.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold backdrop-blur-sm"
                    >
                      {kindLabel[k] ?? k}
                    </span>
                  ))}
                  <span className="rounded-full bg-accent/25 px-3 py-1 text-xs font-semibold text-white ring-1 ring-accent/40">
                    ★ {ratingLabel}
                    {profile.ratingCount > 0 ? ` · ${profile.ratingCount} valoraciones` : ''}
                  </span>
                </div>
                {badges.some((b) => b.earned) ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {badges
                      .filter((b) => b.earned)
                      .map((b) => (
                        <span
                          key={b.id}
                          className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur"
                        >
                          {b.label}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4 p-8">
            <p className="text-sm leading-relaxed text-muted-foreground">{profile.bioShort}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {rates.length > 0 ? (
                <span className="rounded-xl bg-muted px-3 py-2 font-medium tabular-nums">
                  Desde {formatMoneyMinor(profile.priceFromMinor, profile.currency)}{' '}
                  <span className="text-muted-foreground">COP</span>
                </span>
              ) : (
                <span className="rounded-xl bg-muted px-3 py-2 font-medium text-muted-foreground">
                  Sin tarifas publicadas
                </span>
              )}
              <span className="rounded-xl bg-muted px-3 py-2">
                {formatServiceMode(profile.serviceMode)}
              </span>
              {profile.ageBands.length > 0 ? (
                <span className="rounded-xl bg-muted px-3 py-2">
                  Edades: {formatAgeBands(profile.ageBands)}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={buttonStyles('primary', 'rounded-xl cursor-default !bg-accent !text-primary')}>
                Reservar o contactar
              </span>
              <span className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground">
                Video presentación (próximamente)
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 border-t border-border p-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h3 className="text-base font-semibold text-foreground">Sobre mí</h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {profile.bioLong}
            </p>
            {profile.methodology.trim() ? (
              <>
                <h3 className="mt-8 text-base font-semibold text-foreground">Metodología</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{profile.methodology}</p>
              </>
            ) : null}
          </section>
          <aside className="space-y-4 rounded-2xl bg-muted/50 p-5">
            <h3 className="text-sm font-semibold text-foreground">Completitud del perfil</h3>
            <p className="text-3xl font-bold text-primary">{completion.scorePercent}%</p>
            <ul className="space-y-2 text-sm">
              {pending.slice(0, 4).map((i) => (
                <li key={i.id} className="rounded-lg bg-amber-50/90 px-2 py-1.5 text-amber-950">
                  Mejora: {i.label} ({i.impactLabel})
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Publica tarifas en <strong>COP</strong> y ventanas en Agenda para que la vitrina
              coincida con lo que pueden reservar las familias.
            </p>
          </aside>
        </div>

        <div className="border-t border-border p-8">
          <h3 className="text-base font-semibold text-foreground">Trayectoria y enfoque</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Experiencia
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {profile.yearsOfExperience != null && profile.yearsOfExperience > 0
                  ? `${profile.yearsOfExperience} años`
                  : '—'}
              </dd>
            </div>
            <div className="rounded-xl bg-muted px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Modalidad
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {profile.serviceMode ? modeLabel[profile.serviceMode] ?? profile.serviceMode : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2 rounded-xl bg-muted px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Especialidades
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {(profile.focusAreas ?? []).length
                  ? (profile.focusAreas ?? []).join(' · ')
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-6 border-t border-border p-8 sm:grid-cols-2">
          <section>
            <h3 className="text-base font-semibold text-foreground">Detalle público</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Categorías: </span>
              {profile.categories.length ? profile.categories.join(' · ') : '—'}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Idiomas: </span>
              {profile.languages.length ? profile.languages.join(', ') : '—'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Certificaciones: </span>
              {profile.certifications.length ? profile.certifications.join('; ') : '—'}
            </p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-foreground">Ubicación</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {profile.city?.trim() || '—'}
              {profile.zones.length ? ` · ${profile.zones.join(', ')}` : ''}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {profile.yearsOfExperience} años de experiencia · {profile.averageRating.toFixed(1)} estrellas (
              {profile.ratingCount} opiniones)
            </p>
          </section>
        </div>

        <div className="border-t border-border p-8">
          <h3 className="text-base font-semibold text-foreground">Tarifas (COP)</h3>
          {rates.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no has publicado tarifas en COP. Las familias las ven en la columna de reserva de
              tu ficha pública cuando inicien sesión.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rates.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm"
                >
                  <span className="text-foreground">
                    {r.label?.trim() || 'Servicio'}{' '}
                    <span className="text-muted-foreground">({rateUnitLabel(r.unit)})</span>
                  </span>
                  <span className="shrink-0 font-semibold text-foreground tabular-nums">
                    {formatMoneyMinor(r.amountMinor, r.currency)}{' '}
                    <span className="text-xs font-medium text-muted-foreground">COP</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-8">
          <h3 className="text-base font-semibold text-foreground">Disponibilidad publicada</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Mismo calendario de ventanas que en tu ficha pública (vista solo lectura).
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm sm:p-3">
            {calendarBlocks.length > 0 ? (
              <EducatorAvailabilityCalendar blocks={calendarBlocks} />
            ) : (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No hay ventanas futuras. Publica franjas en Agenda y horarios para que aparezcan
                aquí y en la URL pública.
              </p>
            )}
          </div>
        </div>

        {profile.galleryUrls.length > 0 ? (
          <div className="border-t border-border p-8">
            <h3 className="text-base font-semibold text-foreground">Galería</h3>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.galleryUrls.map((url) => (
                <li key={url} className="aspect-video overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="border-t border-border p-8">
          <h3 className="text-base font-semibold text-foreground">Valoraciones</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Misma media y contador que en Explorar; debajo, las valoraciones recientes de familias
            con sesión completada.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-foreground">{ratingLabel}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.ratingCount > 0
              ? `Basado en ${profile.ratingCount} valoración${profile.ratingCount === 1 ? '' : 'es'} registradas.`
              : 'Aún no hay valoraciones registradas.'}
          </p>
          {reviews.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Aún no hay valoraciones de familias en citas completadas.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-foreground">{r.authorName}</span>
                    <span className="text-amber-700">{r.rating} estrellas</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
