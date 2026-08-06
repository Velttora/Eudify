'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type { AgeBand, EducatorOffer, OfferStatus } from '@/features/educator-hub/domain/types';
import {
  createProviderOffer,
  listMyProviderOffers,
  patchProviderOffer,
  type CreateProviderOfferBody,
  type PatchProviderOfferBody,
} from '@/features/educator-hub/api/provider-offers-api';
import {
  formatAgeBands,
  formatMoneyMinor,
  formatOfferStatus,
  formatOfferType,
  formatServiceMode,
} from '@/features/educator-hub/application/educator-format';
import {
  hasMigratedLocalOffersToApi,
  loadLocalOffers,
  markLocalOffersMigratedToApi,
} from '@/features/educator-hub/lib/local-offers-storage';
import {
  EducatorOfferEditorModal,
  type EducatorOfferEditorMode,
} from '@/features/educator-hub/presentation/views/educator-offer-editor-modal';
import { ApiError } from '@/shared/lib/api';
import { buttonStyles } from '@/shared/components/ui/button';

const AGE_VALUES: readonly AgeBand[] = ['0_3', '4_7', '8_12', '13_18'];

function isAgeBand(s: string): s is AgeBand {
  return (AGE_VALUES as readonly string[]).includes(s);
}

function normalizeOfferRow(row: EducatorOffer): EducatorOffer {
  const ageBands = (row.ageBands ?? []).filter(isAgeBand);
  return {
    ...row,
    ageBands,
    bookingsCount: Number(row.bookingsCount ?? 0),
    viewsCount: Number(row.viewsCount ?? 0),
  };
}

function mapEducatorOfferToCreateBody(o: EducatorOffer): CreateProviderOfferBody {
  return {
    type: o.type,
    title: o.title.trim() || 'Sin título',
    category: o.category.trim() || undefined,
    description: o.description.trim() || 'Descripción pendiente.',
    ageBands: o.ageBands.length ? o.ageBands : undefined,
    modality: o.modality,
    durationMinutes: Math.max(15, o.durationMinutes || 60),
    priceMinor: Math.max(0, o.priceMinor ?? 0),
    currency: o.currency,
    objectives: o.objectives?.filter((x) => x.trim()).length ? o.objectives : undefined,
    methodologyNote: o.methodologyNote.trim() || undefined,
    suggestedFrequency: o.suggestedFrequency.trim() || 'A convenir',
    maxSeats: o.maxSeats ?? undefined,
    status: o.status,
  };
}

function mapEducatorOfferToPatchBody(o: EducatorOffer): PatchProviderOfferBody {
  return mapEducatorOfferToCreateBody(o);
}

async function migrateLocalOffersIfNeeded(
  getToken: () => Promise<string | null>,
  userId: string,
): Promise<void> {
  if (typeof window === 'undefined' || hasMigratedLocalOffersToApi(userId)) return;
  const local = loadLocalOffers(userId);
  if (local.length === 0) {
    markLocalOffersMigratedToApi(userId);
    return;
  }
  for (const o of local) {
    const body = mapEducatorOfferToCreateBody(normalizeOfferRow(o));
    await createProviderOffer(getToken, body);
  }
  markLocalOffersMigratedToApi(userId);
}

const FILTERS: { id: 'all' | OfferStatus; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'PUBLISHED', label: 'Publicadas' },
  { id: 'DRAFT', label: 'Borradores' },
  { id: 'PAUSED', label: 'Pausadas' },
];

export function EducatorOffersPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EducatorOfferEditorMode>('create');
  const [editorSeed, setEditorSeed] = useState<EducatorOffer | null>(null);

  const offersQuery = useQuery({
    queryKey: ['provider-offers', 'me'],
    queryFn: async () => {
      if (!userId) return [];
      await migrateLocalOffersIfNeeded(getToken, userId);
      const rows = await listMyProviderOffers(getToken);
      return rows.map(normalizeOfferRow);
    },
    enabled: Boolean(isLoaded && userId),
  });

  const offers = offersQuery.data ?? [];

  const list = useMemo(() => {
    if (filter === 'all') return offers;
    return offers.filter((o) => o.status === filter);
  }, [offers, filter]);

  function openCreate() {
    setEditorMode('create');
    setEditorSeed(null);
    setEditorOpen(true);
  }

  function openEdit(offer: EducatorOffer) {
    setEditorMode('edit');
    setEditorSeed({ ...offer });
    setEditorOpen(true);
  }

  const handleSaveOffer = useCallback(
    async (offer: EducatorOffer, intent: 'draft' | 'publish') => {
      let nextStatus: OfferStatus;
      if (intent === 'publish') nextStatus = 'PUBLISHED';
      else if (offer.status === 'PUBLISHED') nextStatus = 'PUBLISHED';
      else if (offer.status === 'PAUSED') nextStatus = 'PAUSED';
      else nextStatus = 'DRAFT';

      const finalOffer: EducatorOffer = { ...offer, status: nextStatus };
      if (editorMode === 'create') {
        await createProviderOffer(getToken, mapEducatorOfferToCreateBody(finalOffer));
      } else {
        await patchProviderOffer(getToken, finalOffer.id, mapEducatorOfferToPatchBody(finalOffer));
      }
      await qc.invalidateQueries({ queryKey: ['provider-offers', 'me'] });
    },
    [editorMode, getToken, qc],
  );

  async function duplicateOffer(o: EducatorOffer) {
    const body = mapEducatorOfferToCreateBody(
      normalizeOfferRow({
        ...o,
        title: o.title.trim() ? `${o.title.trim()} (copia)` : 'Copia de oferta',
        status: 'DRAFT',
        bookingsCount: 0,
        viewsCount: 0,
      }),
    );
    await createProviderOffer(getToken, { ...body, status: 'DRAFT' });
    await qc.invalidateQueries({ queryKey: ['provider-offers', 'me'] });
  }

  async function togglePause(o: EducatorOffer) {
    if (o.status === 'DRAFT') return;
    const next: OfferStatus = o.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED';
    await patchProviderOffer(getToken, o.id, { status: next });
    await qc.invalidateQueries({ queryKey: ['provider-offers', 'me'] });
  }

  if (!isLoaded) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-[var(--muted-foreground)]">Cargando…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Ofertas</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Inicia sesión para gestionar tus ofertas.</p>
      </div>
    );
  }

  const loadError =
    offersQuery.error instanceof ApiError
      ? offersQuery.error.message
      : offersQuery.error instanceof Error
        ? offersQuery.error.message
        : offersQuery.error
          ? 'No se pudieron cargar las ofertas.'
          : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Ofertas</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Crea clases 1:1, talleres, paquetes o cualquier servicio. Las sugerencias son solo atajos: puedes editarlo
            todo. Las familias pueden vincular la reserva a una oferta publicada si quieren; la cita solo queda ligada si
            la eligen.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={buttonStyles('primary', 'shrink-0 rounded-xl')}>
          Crear oferta
        </button>
      </header>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.id
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loadError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{loadError}</p>
      ) : null}
      <ul className="space-y-4">
        {offersQuery.isLoading ? (
          <li className="text-sm text-[var(--muted-foreground)]">Cargando ofertas…</li>
        ) : null}
        {!offersQuery.isLoading && list.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
            Aún no tienes ofertas. Pulsa <span className="font-medium text-[var(--foreground)]">Crear oferta</span>{' '}
            y elige una sugerencia o deja el formulario a tu gusto.
          </li>
        ) : null}
        {list.map((o) => (
          <li
            key={o.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                    {formatOfferType(o.type)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      o.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-900'
                        : o.status === 'DRAFT'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {formatOfferStatus(o.status)}
                  </span>
                  {o.category ? (
                    <span className="text-xs text-[var(--muted-foreground)]">{o.category}</span>
                  ) : null}
                </div>
                <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {o.title.trim() || 'Borrador sin título'}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                  {o.description.trim() || 'Sin descripción aún.'}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm">
                <p className="font-semibold tabular-nums text-[var(--primary)]">
                  {o.priceMinor > 0 ? (
                    <>
                      {formatMoneyMinor(o.priceMinor, o.currency)}{' '}
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">COP</span>
                    </>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">Precio por definir</span>
                  )}
                </p>
                <p className="text-[var(--muted-foreground)]">{o.durationMinutes} min</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatServiceMode(o.modality)}</p>
                {o.maxSeats != null ? (
                  <p className="text-xs text-[var(--muted-foreground)]">Hasta {o.maxSeats} cupos</p>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              Edades {o.ageBands.length ? formatAgeBands(o.ageBands) : 'no indicadas'} · {o.suggestedFrequency} ·{' '}
              {o.viewsCount} vistas · {o.bookingsCount} reservas
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEdit(o)}
                className={buttonStyles('secondary', 'rounded-lg py-2 text-xs')}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => void duplicateOffer(o)}
                className={buttonStyles('secondary', 'rounded-lg py-2 text-xs')}
              >
                Duplicar
              </button>
              {o.status === 'DRAFT' ? (
                <button
                  type="button"
                  onClick={() => openEdit(o)}
                  className={buttonStyles('ghost', 'rounded-lg py-2 text-xs')}
                >
                  Publicar desde editor
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void togglePause(o)}
                  className={buttonStyles('ghost', 'rounded-lg py-2 text-xs')}
                >
                  {o.status === 'PUBLISHED' ? 'Pausar' : 'Reactivar'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <EducatorOfferEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        seed={editorSeed}
        mode={editorMode}
        onSave={handleSaveOffer}
      />
    </div>
  );
}
