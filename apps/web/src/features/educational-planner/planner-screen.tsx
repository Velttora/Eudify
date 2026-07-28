'use client';

import {
  ALL_CATEGORY_IDS,
  LEARNING_CATEGORY_LABELS,
  ageInYearsFromBirth,
  getDevelopmentStageByAge,
  type ContentIntensity,
  type PlannerChildProfile,
} from '@repo/educational-planner';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useBootstrapQuery } from '@/features/bootstrap/hooks/use-bootstrap';
import { consumerHubHref } from '@/features/consumer/lib/consumer-hub';
import type { BootstrapChild } from '@/shared/types/bootstrap';
import {
  getLearningPlan,
  listLearningPlans,
  saveLearningPlan,
} from '@/features/educational-planner/planner-api';
import { PlannerRoadmap } from '@/features/educational-planner/planner-roadmap';
import { usePlannerStore } from '@/features/educational-planner/planner-store';
import { PLANNER_DEMO_CHILDREN } from '@/features/educational-planner/mock-profiles';
import { getMyPlan } from '@/features/subscriptions/api/subscriptions-api';
import { AppHeader } from '@/shared/components/app-header';
import { Button } from '@/shared/components/ui/button';
import { ApiError } from '@/shared/lib/api';

/** Debe coincidir con FREE_PLAN_CATEGORY_ID en apps/api/src/planner/planner.service.ts. */
const FREE_PLAN_CATEGORY_ID = ALL_CATEGORY_IDS[0];

function intensityLabel(i: ContentIntensity): string {
  const map: Record<ContentIntensity, string> = {
    LOW: 'Ligera',
    MODERATE: 'Moderada',
    HIGH: 'Sostenida',
  };
  return map[i];
}

function formatSavedAt(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('es', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function splitGoalsOrInterests(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function bootstrapChildToPlanner(c: BootstrapChild): PlannerChildProfile {
  return {
    id: c.id,
    displayName: c.firstName,
    birthDate: c.birthDate,
    interests: splitGoalsOrInterests(c.interests ?? ''),
    goals: splitGoalsOrInterests(c.notes ?? ''),
    weeklyMinutesAvailable: 90,
  };
}

export function PlannerScreen() {
  const { userId, isLoaded, getToken } = useAuth();
  const bootstrapQuery = useBootstrapQuery({
    enabled: Boolean(isLoaded && userId),
  });
  const boot = bootstrapQuery.data;
  const providerInHub =
    boot?.user?.role === 'PROVIDER' &&
    !boot.needsRoleSelection &&
    !boot.needsOnboarding;

  const realChildren = useMemo(
    () => boot?.consumerProfile?.children?.map(bootstrapChildToPlanner) ?? [],
    [boot?.consumerProfile?.children],
  );

  const myPlanQuery = useQuery({
    queryKey: ['subscriptions', 'me'],
    queryFn: () => getMyPlan(getToken),
    enabled: Boolean(isLoaded && userId && !providerInHub),
    staleTime: 60 * 1000,
  });
  const canAccessFullPlanner = myPlanQuery.data
    ? myPlanQuery.data.plan !== 'SEMILLA'
    : true;

  const plannerHeader = useMemo(() => {
    if (providerInHub) {
      return {
        logoHref: '/dashboard/provider' as const,
        links: [
          {
            href: '/dashboard/provider',
            label: 'Mi panel',
            emphasized: true as const,
          },
          { href: '/profile/provider', label: 'Mi perfil' },
        ],
      };
    }
    return {
      logoHref: '/explorar' as const,
      links: [
        { href: consumerHubHref('resumen'), label: 'Mi espacio' },
        { href: '/planner', label: 'Planner', emphasized: true as const },
        { href: '/explorar', label: 'Educadores' },
        { href: consumerHubHref('familia'), label: 'Familia y datos' },
      ],
    };
  }, [providerInHub]);

  const child = usePlannerStore((s) => s.child);
  const categoryId = usePlannerStore((s) => s.categoryId);
  const suggestion = usePlannerStore((s) => s.suggestion);
  const items = usePlannerStore((s) => s.items);
  const lastSavedAt = usePlannerStore((s) => s.lastSavedAt);

  const setChild = usePlannerStore((s) => s.setChild);
  const setCategory = usePlannerStore((s) => s.setCategory);
  const generateSuggestion = usePlannerStore((s) => s.generateSuggestion);
  const acceptSuggestionToRoadmap = usePlannerStore(
    (s) => s.acceptSuggestionToRoadmap,
  );
  const reorderItems = usePlannerStore((s) => s.reorderItems);
  const removeItem = usePlannerStore((s) => s.removeItem);
  const updateItem = usePlannerStore((s) => s.updateItem);
  const addCourseToRoadmap = usePlannerStore((s) => s.addCourseToRoadmap);
  const addCustomBlock = usePlannerStore((s) => s.addCustomBlock);
  const clearRoadmap = usePlannerStore((s) => s.clearRoadmap);
  const hydrateFromPlan = usePlannerStore((s) => s.hydrateFromPlan);
  const saveDraft = usePlannerStore((s) => s.saveDraft);

  const [saveFlash, setSaveFlash] = useState(false);
  const loadedPlanKeysRef = useRef(new Set<string>());

  const persistedPlanQuery = useQuery({
    queryKey: ['planner', 'plan', child.id, categoryId],
    queryFn: () => getLearningPlan(getToken, child.id, categoryId),
    enabled: Boolean(isLoaded && userId && child.id && categoryId),
    staleTime: 5 * 60 * 1000,
  });

  const recentPlansQuery = useQuery({
    queryKey: ['planner', 'plans'],
    queryFn: () => listLearningPlans(getToken),
    enabled: Boolean(isLoaded && userId),
    staleTime: 5 * 60 * 1000,
  });

  const savePlanMutation = useMutation({
    mutationFn: () =>
      saveLearningPlan(getToken, {
        child,
        categoryId,
        title: `Roadmap de ${child.displayName} (${LEARNING_CATEGORY_LABELS[categoryId]})`,
        status: 'DRAFT',
        items,
      }),
    onSuccess: (plan) => {
      hydrateFromPlan(plan);
      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 2000);
    },
  });

  useEffect(() => {
    const plan = persistedPlanQuery.data;
    if (!plan) return;
    const key = `${plan.id}:${plan.updatedAt}`;
    if (loadedPlanKeysRef.current.has(key)) return;
    loadedPlanKeysRef.current.add(key);
    hydrateFromPlan(plan);
  }, [hydrateFromPlan, persistedPlanQuery.data]);

  useEffect(() => {
    if (lastSavedAt || items.length > 0) return;
    const latestPlan = recentPlansQuery.data?.[0];
    if (!latestPlan) return;
    const key = `${latestPlan.id}:${latestPlan.updatedAt}`;
    if (loadedPlanKeysRef.current.has(key)) return;
    loadedPlanKeysRef.current.add(key);
    hydrateFromPlan(latestPlan);
  }, [hydrateFromPlan, items.length, lastSavedAt, recentPlansQuery.data]);

  // Si el store sigue con el child demo inicial y hay hijos reales del perfil, inicializar con el primero.
  useEffect(() => {
    if (realChildren.length === 0) return;
    if (!child.id.startsWith('demo-')) return;
    setChild(realChildren[0]!);
  }, [realChildren, child.id, setChild]);

  const ageYears = useMemo(
    () => ageInYearsFromBirth(child.birthDate),
    [child.birthDate],
  );

  const stageFromProfile = useMemo(
    () => getDevelopmentStageByAge(child.birthDate),
    [child.birthDate],
  );

  const courseIdsOnRoadmap = useMemo(
    () => new Set(items.map((i) => i.courseId).filter(Boolean) as string[]),
    [items],
  );

  function handleSaveDraft() {
    if (isLoaded && userId) {
      savePlanMutation.mutate();
      return;
    }
    saveDraft();
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        logoHref={plannerHeader.logoHref}
        pageLabel="Planner"
        links={plannerHeader.links}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Educational Planner
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Roadmap por edad y evidencia
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Las sugerencias parten de etapas de desarrollo y plantillas
            pedagógicas, no de listas arbitrarias. Puedes aceptar, editar y
            reordenar con criterio familiar.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Panel perfil + controles */}
          <aside className="w-full shrink-0 space-y-5 lg:sticky lg:top-24 lg:max-w-sm">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-bold text-primary">Perfil del menor</h2>
              {realChildren.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Datos de tu perfil familiar.{' '}
                  <Link
                    href="/dashboard/consumer?seccion=familia"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Editar familia
                  </Link>
                </p>
              ) : isLoaded && userId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  No tienes menores agregados.{' '}
                  <Link
                    href="/dashboard/consumer?seccion=familia"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Agregar menor
                  </Link>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Demo — inicia sesión para ver tus menores.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                  ~{ageYears.toFixed(1)} años
                </span>
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {stageFromProfile.label}
                </span>
                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {LEARNING_CATEGORY_LABELS[categoryId]}
                </span>
              </div>

              {realChildren.length > 0 ? (
                <label className="mt-4 block text-xs font-semibold text-foreground">
                  Selecciona un menor
                  <select
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={realChildren.some((c) => c.id === child.id) ? child.id : realChildren[0]!.id}
                    onChange={(e) => {
                      const next = realChildren.find((c) => c.id === e.target.value);
                      if (next) setChild(next);
                    }}
                  >
                    {realChildren.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} · {c.birthDate}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="mt-4 block text-xs font-semibold text-foreground">
                  Perfil rápido (demo)
                  <select
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={PLANNER_DEMO_CHILDREN.some((d) => d.id === child.id) ? child.id : ''}
                    onChange={(e) => {
                      const next = PLANNER_DEMO_CHILDREN.find((d) => d.id === e.target.value);
                      if (next) setChild(next);
                    }}
                  >
                    <option value="">— Personalizado abajo —</option>
                    {PLANNER_DEMO_CHILDREN.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.displayName} · {d.birthDate}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="mt-3 block text-xs font-semibold text-foreground">
                Nombre
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={child.displayName}
                  onChange={(e) =>
                    setChild({ ...child, displayName: e.target.value })
                  }
                />
              </label>

              <label className="mt-3 block text-xs font-semibold text-foreground">
                Fecha de nacimiento
                <input
                  type="date"
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={child.birthDate.slice(0, 10)}
                  onChange={(e) =>
                    setChild({ ...child, birthDate: e.target.value })
                  }
                />
              </label>

              <label className="mt-3 block text-xs font-semibold text-foreground">
                Minutos disponibles / semana (eje elegido)
                <input
                  type="number"
                  min={0}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={child.weeklyMinutesAvailable}
                  onChange={(e) =>
                    setChild({
                      ...child,
                      weeklyMinutesAvailable: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>

              <label className="mt-3 block text-xs font-semibold text-foreground">
                Intereses (separados por coma)
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={child.interests.join(', ')}
                  onChange={(e) =>
                    setChild({
                      ...child,
                      interests: splitGoalsOrInterests(e.target.value),
                    })
                  }
                />
              </label>

              <label className="mt-3 block text-xs font-semibold text-foreground">
                Objetivos (separados por coma)
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={child.goals.join(', ')}
                  onChange={(e) =>
                    setChild({
                      ...child,
                      goals: splitGoalsOrInterests(e.target.value),
                    })
                  }
                />
              </label>

              <label className="mt-3 block text-xs font-semibold text-foreground">
                Preferencias (opcional, coma)
                <input
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={(child.learningPreferenceTags ?? []).join(', ')}
                  onChange={(e) =>
                    setChild({
                      ...child,
                      learningPreferenceTags: splitGoalsOrInterests(
                        e.target.value,
                      ),
                    })
                  }
                />
              </label>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-bold text-primary">Categoría</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALL_CATEGORY_IDS.map((id) => {
                  const locked = !canAccessFullPlanner && id !== FREE_PLAN_CATEGORY_ID;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategory(id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        categoryId === id
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {LEARNING_CATEGORY_LABELS[id]}
                      {locked ? ' 🔒' : ''}
                    </button>
                  );
                })}
              </div>
              {!canAccessFullPlanner ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Tu plan Semilla incluye {LEARNING_CATEGORY_LABELS[FREE_PLAN_CATEGORY_ID]}. Puedes
                  explorar los demás ejes, pero guardar el roadmap requiere{' '}
                  <Link href="/#precios" className="font-semibold text-primary underline-offset-2 hover:underline">
                    plan Familia
                  </Link>
                  .
                </p>
              ) : null}
            </section>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full rounded-xl bg-primary text-white hover:bg-primary-hover"
                onClick={() => generateSuggestion()}
              >
                Generar sugerencia
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-xl"
                disabled={!suggestion}
                onClick={() => acceptSuggestionToRoadmap()}
              >
                Usar roadmap sugerido
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-xl"
                onClick={() => addCustomBlock()}
              >
                Añadir bloque vacío
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 rounded-xl text-xs"
                  disabled={savePlanMutation.isPending}
                  onClick={() => handleSaveDraft()}
                >
                  {savePlanMutation.isPending ? 'Guardando...' : 'Guardar borrador'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 rounded-xl text-xs text-red-800 hover:bg-red-50"
                  onClick={() => clearRoadmap()}
                >
                  Vaciar roadmap
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {savePlanMutation.isError ? (
                  <span className="font-semibold text-red-800">
                    {savePlanMutation.error instanceof ApiError &&
                    savePlanMutation.error.status === 402 ? (
                      <>
                        {savePlanMutation.error.message}{' '}
                        <Link href="/#precios" className="underline underline-offset-2">
                          Ver planes →
                        </Link>
                      </>
                    ) : (
                      'No se pudo guardar en la nube. Intenta de nuevo.'
                    )}
                  </span>
                ) : saveFlash ? (
                  <span className="font-semibold text-accent">
                    {userId ? 'Guardado en la nube.' : 'Guardado en este dispositivo.'}
                  </span>
                ) : persistedPlanQuery.isFetching ? (
                  'Buscando borrador guardado...'
                ) : formatSavedAt(lastSavedAt) ? (
                  <>
                    Último guardado:{' '}
                    <span className="font-medium text-foreground">
                      {formatSavedAt(lastSavedAt)}
                    </span>
                  </>
                ) : (
                  'Los cambios se sincronizan en localStorage al editar.'
                )}
              </p>
            </div>
          </aside>

          {/* Contenido principal */}
          <div className="min-w-0 flex-1 space-y-6">
            {suggestion ? (
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-primary">
                      Por qué este plan
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Plantilla:{' '}
                      <span className="font-semibold text-foreground">
                        {suggestion.template.title}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/80 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Intensidad semanal sugerida
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {intensityLabel(suggestion.weeklyIntensityHint)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
                  {suggestion.masterRationale
                    .split(/\n\n+/)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>

                {suggestion.relatedInsight ? (
                  <div className="mt-5 rounded-xl border border-accent/25 bg-accent-soft/20 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {suggestion.relatedInsight.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                      {suggestion.relatedInsight.body}
                    </p>
                  </div>
                ) : null}

                {suggestion.appliedRules.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Reglas aplicadas a tus objetivos
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                      {suggestion.appliedRules.map((r) => (
                        <li key={r.ruleId} className="flex gap-2">
                          <span className="text-accent" aria-hidden>
                            ·
                          </span>
                          <span>{r.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center sm:px-8">
                <p className="text-sm font-medium text-primary">
                  Aún no hay sugerencia activa
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ajusta el perfil y la categoría, luego pulsa &quot;Generar
                  sugerencia&quot; para ver el fundamento y los cursos
                  filtrados por edad.
                </p>
              </section>
            )}

            {suggestion && suggestion.suggestedCourses.length > 0 ? (
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-bold text-primary">
                  Cursos sugeridos
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ordenados por reglas declarativas y afinidad con la edad;
                  añade los que encajen en vuestra semana real.
                </p>
                <ul className="mt-4 space-y-3">
                  {suggestion.suggestedCourses.map((c) => {
                    const onRoadmap = courseIdsOnRoadmap.has(c.id);
                    return (
                      <li
                        key={c.id}
                        className="flex flex-col gap-2 rounded-xl border border-border/80 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">
                            {c.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {c.shortDescription}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Formato: {c.format.replace(/_/g, ' ').toLowerCase()}{' '}
                            · ~{c.suggestedWeeklyMinutes} min/sem
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="shrink-0 rounded-lg px-3 py-2 text-xs"
                          disabled={onRoadmap}
                          onClick={() => addCourseToRoadmap(c.id)}
                        >
                          {onRoadmap ? 'Ya en el roadmap' : 'Añadir al roadmap'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-primary">
                    Roadmap
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Arrastra el asa ⋮⋮ para reordenar. Cada bloque incluye el
                    fundamento pedagógico.
                  </p>
                </div>
                <Link
                  href={consumerHubHref('resumen')}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Volver al panel familia
                </Link>
              </div>
              <PlannerRoadmap
                items={items}
                onReorder={reorderItems}
                onRemove={removeItem}
                onChangeTitle={(id, title) => updateItem(id, { title })}
                onChangeNotes={(id, notes) => updateItem(id, { notes })}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
