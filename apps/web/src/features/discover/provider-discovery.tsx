'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProviderCard } from '@/features/discover/provider-card';
import { publicApiRequest } from '@/shared/lib/api';
import { Button } from '@/shared/components/ui/button';
import { Field, Input, Select } from '@/shared/components/ui/field';

export type DiscoverProvider = {
  id: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
  kinds: string[];
  averageRating: number | null;
  reviewCount: number;
  isAvailable: boolean;
  availabilityText: string | null;
};

type DiscoverProviderApiRow = {
  id: string;
  fullName: string | null;
  bio: string | null;
  photoUrl: string | null;
  kinds: string[];
  averageRating: number;
  ratingCount: number;
  availabilitySummary: string | null;
  city: string | null;
  serviceMode: string | null;
  yearsOfExperience: number | null;
  focusAreas: string[];
};

export type DiscoverFilters = {
  kind: string;
  serviceMode: string;
  city: string;
  q: string;
  focus: string;
  minYearsExperience: string;
  minRating: string;
  minReviewCount: string;
};

const EMPTY_FILTERS: DiscoverFilters = {
  kind: '',
  serviceMode: '',
  city: '',
  q: '',
  focus: '',
  minYearsExperience: '',
  minRating: '',
  minReviewCount: '',
};

function serviceModeLabel(mode: string | null | undefined): string | null {
  if (!mode) return null;
  if (mode === 'IN_PERSON') return 'Presencial';
  if (mode === 'ONLINE') return 'En línea';
  if (mode === 'HYBRID') return 'Híbrido';
  return null;
}

function headlineFrom(row: DiscoverProviderApiRow): string | null {
  const parts = [
    row.city?.trim() || null,
    serviceModeLabel(row.serviceMode ?? null),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function mapDiscoverRow(row: DiscoverProviderApiRow): DiscoverProvider {
  const rating =
    typeof row.averageRating === 'number' && !Number.isNaN(row.averageRating)
      ? row.averageRating
      : null;
  return {
    id: row.id,
    displayName: row.fullName?.trim() || 'Educador',
    headline: headlineFrom(row),
    bio: row.bio,
    photoUrl: row.photoUrl,
    kinds: row.kinds ?? [],
    averageRating: rating,
    reviewCount: row.ratingCount,
    isAvailable: true,
    availabilityText: row.availabilitySummary,
  };
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function buildDiscoverQuery(f: DiscoverFilters): string {
  const sp = new URLSearchParams();
  if (f.kind) sp.set('kind', f.kind);
  if (f.serviceMode) sp.set('serviceMode', f.serviceMode);
  if (f.city.trim()) sp.set('city', f.city.trim());
  if (f.minYearsExperience) sp.set('minYearsExperience', f.minYearsExperience);
  if (f.minRating) sp.set('minRating', f.minRating);
  if (f.minReviewCount) sp.set('minReviewCount', f.minReviewCount);
  if (f.focus.trim()) sp.set('focus', f.focus.trim());
  if (f.q.trim()) sp.set('q', f.q.trim());
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function countActiveFilters(f: DiscoverFilters): number {
  let n = 0;
  if (f.kind) n++;
  if (f.serviceMode) n++;
  if (f.city.trim()) n++;
  if (f.q.trim()) n++;
  if (f.focus.trim()) n++;
  if (f.minYearsExperience) n++;
  if (f.minRating) n++;
  if (f.minReviewCount) n++;
  return n;
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function DiscoverFilterFields({
  value,
  onChange,
}: {
  value: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}) {
  const patch = useCallback(
    (p: Partial<DiscoverFilters>) => onChange({ ...value, ...p }),
    [value, onChange],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tipo de servicio">
        <Select value={value.kind} onChange={(e) => patch({ kind: e.target.value })}>
          <option value="">Todos</option>
          <option value="TEACHER">Profesor particular</option>
          <option value="BABYSITTER">Cuidador/a infantil</option>
        </Select>
      </Field>

      <Field label="Modalidad">
        <Select
          value={value.serviceMode}
          onChange={(e) => patch({ serviceMode: e.target.value })}
        >
          <option value="">Todas</option>
          <option value="IN_PERSON">Presencial</option>
          <option value="ONLINE">En línea</option>
          <option value="HYBRID">Híbrido</option>
        </Select>
      </Field>

      <Field label="Ciudad" hint="Contiene el texto (ej. Madrid, Bogotá).">
        <Input
          value={value.city}
          onChange={(e) => patch({ city: e.target.value })}
          placeholder="Ej. Madrid"
          maxLength={80}
        />
      </Field>

      <Field label="Buscar" hint="Nombre, bio, ciudad o disponibilidad publicada.">
        <Input
          value={value.q}
          onChange={(e) => patch({ q: e.target.value })}
          placeholder="Palabra o frase…"
          maxLength={160}
        />
      </Field>

      <div className="sm:col-span-2">
        <Field
          label="Especialización (etiquetas)"
          hint="Separadas por coma; deben coincidir con las del perfil."
        >
          <Input
            value={value.focus}
            onChange={(e) => patch({ focus: e.target.value })}
            placeholder="Ej. inglés, música"
          />
        </Field>
      </div>

      <Field label="Experiencia mínima (años)">
        <Select
          value={value.minYearsExperience}
          onChange={(e) => patch({ minYearsExperience: e.target.value })}
        >
          <option value="">Cualquiera</option>
          <option value="1">≥ 1 año</option>
          <option value="2">≥ 2 años</option>
          <option value="3">≥ 3 años</option>
          <option value="5">≥ 5 años</option>
          <option value="10">≥ 10 años</option>
        </Select>
      </Field>

      <Field label="Valoración mínima">
        <Select value={value.minRating} onChange={(e) => patch({ minRating: e.target.value })}>
          <option value="">Cualquiera</option>
          <option value="3">≥ 3 ★</option>
          <option value="4">≥ 4 ★</option>
          <option value="4.5">≥ 4,5 ★</option>
        </Select>
      </Field>

      <Field label="Mínimo de valoraciones">
        <Select
          value={value.minReviewCount}
          onChange={(e) => patch({ minReviewCount: e.target.value })}
        >
          <option value="">Cualquiera</option>
          <option value="1">Al menos 1</option>
          <option value="3">Al menos 3</option>
          <option value="5">Al menos 5</option>
          <option value="10">Al menos 10</option>
        </Select>
      </Field>
    </div>
  );
}

function ActiveFilterChips({
  applied,
  onRemove,
}: {
  applied: DiscoverFilters;
  onRemove: (patch: Partial<DiscoverFilters>) => void;
}) {
  const chips: { key: string; label: string; patch: Partial<DiscoverFilters> }[] = [];

  if (applied.kind === 'TEACHER') {
    chips.push({ key: 'kind', label: 'Profesor particular', patch: { kind: '' } });
  } else if (applied.kind === 'BABYSITTER') {
    chips.push({ key: 'kind', label: 'Cuidador/a', patch: { kind: '' } });
  }

  const mode = serviceModeLabel(applied.serviceMode);
  if (mode && applied.serviceMode) {
    chips.push({
      key: 'mode',
      label: mode,
      patch: { serviceMode: '' },
    });
  }

  if (applied.city.trim()) {
    chips.push({
      key: 'city',
      label: `Ciudad: ${applied.city.trim()}`,
      patch: { city: '' },
    });
  }

  if (applied.q.trim()) {
    chips.push({
      key: 'q',
      label: `«${applied.q.trim().slice(0, 28)}${applied.q.trim().length > 28 ? '…' : ''}»`,
      patch: { q: '' },
    });
  }

  if (applied.focus.trim()) {
    chips.push({
      key: 'focus',
      label: `Etiquetas: ${applied.focus.trim().slice(0, 32)}${applied.focus.trim().length > 32 ? '…' : ''}`,
      patch: { focus: '' },
    });
  }

  if (applied.minYearsExperience) {
    chips.push({
      key: 'y',
      label: `≥ ${applied.minYearsExperience} años`,
      patch: { minYearsExperience: '' },
    });
  }

  if (applied.minRating) {
    chips.push({
      key: 'r',
      label: `≥ ${applied.minRating.replace('.', ',')} ★`,
      patch: { minRating: '' },
    });
  }

  if (applied.minReviewCount) {
    chips.push({
      key: 'c',
      label: `≥ ${applied.minReviewCount} valoraciones`,
      patch: { minReviewCount: '' },
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onRemove(c.patch)}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/60 py-1 pl-2.5 pr-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          <span className="truncate">{c.label}</span>
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            ×
          </span>
          <span className="sr-only">Quitar filtro</span>
        </button>
      ))}
    </div>
  );
}

export function ProviderDiscovery() {
  const [applied, setApplied] = useState<DiscoverFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<DiscoverFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedCity = useDebounced(applied.city, 400);
  const debouncedQ = useDebounced(applied.q, 400);
  const debouncedFocus = useDebounced(applied.focus, 400);

  const queryString = useMemo(
    () =>
      buildDiscoverQuery({
        ...applied,
        city: debouncedCity,
        q: debouncedQ,
        focus: debouncedFocus,
      }),
    [applied, debouncedCity, debouncedQ, debouncedFocus],
  );

  const query = useQuery({
    queryKey: ['discover', 'providers', queryString],
    queryFn: async () => {
      const raw = await publicApiRequest<DiscoverProviderApiRow[]>(
        `/discover/providers${queryString}`,
      );
      return raw.map(mapDiscoverRow);
    },
  });

  const items = query.data ?? [];
  const empty = !query.isLoading && items.length === 0;
  const activeCount = useMemo(() => countActiveFilters(applied), [applied]);

  const openFilters = useCallback(() => {
    setDraft(applied);
    setFiltersOpen(true);
  }, [applied]);

  const applyFromModal = useCallback(() => {
    setApplied(draft);
    setFiltersOpen(false);
  }, [draft]);

  const closeModal = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  const clearAll = useCallback(() => {
    setApplied(EMPTY_FILTERS);
    setDraft(EMPTY_FILTERS);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(EMPTY_FILTERS);
  }, []);

  const removeChip = useCallback((patch: Partial<DiscoverFilters>) => {
    setApplied((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [filtersOpen, closeModal]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="gap-2 border-primary/25 bg-card font-semibold shadow-sm"
            onClick={openFilters}
          >
            <FilterIcon className="text-primary" />
            Filtros
            {activeCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                {activeCount}
              </span>
            ) : null}
          </Button>
          {activeCount > 0 ? (
            <Button type="button" variant="ghost" className="text-xs text-muted-foreground" onClick={clearAll}>
              Limpiar todo
            </Button>
          ) : null}
        </div>
        {!query.isLoading && !query.isError ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{items.length}</span>
            {items.length === 1 ? ' educador' : ' educadores'}
          </p>
        ) : null}
      </div>

      <ActiveFilterChips applied={applied} onRemove={removeChip} />

      {filtersOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discover-filters-title"
            className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:max-h-[85vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 id="discover-filters-title" className="text-lg font-bold text-foreground">
                  Filtros
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajusta criterios y pulsa «Aplicar filtros» para actualizar el listado. Tras aplicar,
                  ciudad y búsqueda esperan un momento antes de consultar el servidor.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={closeModal}
              >
                Cerrar
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <DiscoverFilterFields value={draft} onChange={setDraft} />
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
              <Button type="button" variant="ghost" className="text-xs sm:text-sm" onClick={resetDraft}>
                Borrador vacío
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="button" variant="primary" onClick={applyFromModal}>
                  Aplicar filtros
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          No pudimos cargar el listado. Comprueba la conexión o inténtalo de nuevo.
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-sm">
          Cargando educadores…
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center text-muted-foreground">
          No hay perfiles que coincidan con los filtros. Abre filtros y amplía criterios o limpia.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  );
}
