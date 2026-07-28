'use client';

import {
  CURRICULUM_MODULES,
  EDIFY_BLOCKS,
  EDIFY_BLOCK_IDS,
  PILAR_LABELS,
  TOTAL_CURRICULUM_MODULES,
  ageInYearsFromBirth,
  getDevelopmentStageByAge,
  type CurriculumModule,
  type PlannerChildProfile,
} from '@repo/educational-planner';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';

import { useBootstrapQuery } from '@/features/bootstrap/hooks/use-bootstrap';
import { consumerHubHref, consumerNavLinks } from '@/features/consumer/lib/consumer-hub';
import type { BootstrapChild } from '@/shared/types/bootstrap';
import {
  completeModule as completeModuleApi,
  getPlannerProgress,
} from '@/features/educational-planner/planner-api';
import { usePlannerStore } from '@/features/educational-planner/planner-store';
import { PLANNER_DEMO_CHILDREN } from '@/features/educational-planner/mock-profiles';
import { getMyPlan } from '@/features/subscriptions/api/subscriptions-api';
import { AppHeader } from '@/shared/components/app-header';
import { Button } from '@/shared/components/ui/button';
import { ApiError } from '@/shared/lib/api';

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

function ModuleDetailCard({
  module: m,
  isCompleted,
  locked,
  onComplete,
  completing,
  upgradeError,
}: {
  module: CurriculumModule;
  isCompleted: boolean;
  locked: boolean;
  onComplete: () => void;
  completing: boolean;
  upgradeError: ApiError | null;
}) {
  const block = EDIFY_BLOCKS[m.block];
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-accent">
        Bloque {block.order} · {block.label} · Módulo {m.number}/{TOTAL_CURRICULUM_MODULES}
      </p>
      <h2 className="mt-1 text-xl font-bold text-primary sm:text-2xl">{m.title}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {m.pilarPrincipal.map((p) => (
          <span
            key={p}
            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary"
          >
            {PILAR_LABELS[p]}
          </span>
        ))}
        {m.ageRange ? (
          <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {m.ageRange}
          </span>
        ) : null}
      </div>

      {m.objetivoPedagogico ? (
        <p className="mt-4 text-sm leading-relaxed text-foreground">{m.objetivoPedagogico}</p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-foreground">{m.focoPractica}</p>
      )}

      {m.recursoDescargable ? (
        <a
          href={m.recursoDescargable.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <span aria-hidden>↓</span>
          {m.recursoDescargable.label}
        </a>
      ) : null}

      {m.contentStatus === 'SUMMARY_ONLY' ? (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Este módulo todavía está en expansión: por ahora solo tenemos el foco central, sin el
          detalle completo de actividades e indicadores.
        </p>
      ) : null}

      {m.actividadesNino?.length ? (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Actividades del niño
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {m.actividadesNino.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  →
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {m.actividadesFamiliares?.length ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Actividades familiares
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {m.actividadesFamiliares.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="text-accent" aria-hidden>
                  →
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {m.indicadoresProgreso?.length ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Indicadores de progreso
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {m.indicadoresProgreso.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  ✓
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {m.resultadoObservable ? (
        <div className="mt-5 rounded-xl border border-accent/25 bg-accent-soft/20 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Resultado observable esperado
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{m.resultadoObservable}</p>
        </div>
      ) : null}

      {m.fundamentacionCientifica?.length ? (
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Fundamentación científica: {m.fundamentacionCientifica.join(' · ')}
        </p>
      ) : null}

      <div className="mt-6">
        {isCompleted ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            Módulo completado ✓
          </span>
        ) : (
          <Button type="button" disabled={completing} onClick={onComplete}>
            {completing ? 'Guardando…' : 'Marcar módulo completado'}
          </Button>
        )}
        {upgradeError ? (
          <p className="mt-3 text-sm font-semibold text-red-800">
            {upgradeError.message}{' '}
            <Link href="/#precios" className="underline underline-offset-2">
              Ver planes →
            </Link>
          </p>
        ) : null}
        {locked && !upgradeError ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Con el plan Semilla puedes completar el Módulo 1. Actualiza a Familia para seguir con el
            resto del Plan Anual.
          </p>
        ) : null}
      </div>
    </section>
  );
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
  const canAccessFullPlanner = myPlanQuery.data ? myPlanQuery.data.plan !== 'SEMILLA' : true;

  const plannerHeader = useMemo(() => {
    if (providerInHub) {
      return {
        logoHref: '/dashboard/provider' as const,
        links: [
          { href: '/dashboard/provider', label: 'Mi panel', emphasized: true as const },
          { href: '/profile/provider', label: 'Mi perfil' },
        ],
      };
    }
    return {
      logoHref: '/explorar' as const,
      links: consumerNavLinks('/planner'),
    };
  }, [providerInHub]);

  const isRealChild = Boolean(userId) && realChildren.length > 0;

  const child = usePlannerStore((s) => s.child);
  const setChild = usePlannerStore((s) => s.setChild);
  const currentModuleNumber = usePlannerStore((s) => s.currentModuleNumber);
  const completedModuleNumbers = usePlannerStore((s) => s.completedModuleNumbers);
  const hydrateProgress = usePlannerStore((s) => s.hydrateProgress);
  const markModuleCompletedLocally = usePlannerStore((s) => s.markModuleCompletedLocally);

  const childMatchesRealChild = realChildren.some((c) => c.id === child.id);

  // Corrige cualquier desajuste entre el hijo guardado localmente y los hijos
  // reales del perfil (no solo el caso demo): evita pedir progreso con un
  // childProfileId que ya no existe para esta familia.
  useEffect(() => {
    if (realChildren.length === 0) return;
    if (childMatchesRealChild) return;
    setChild(realChildren[0]!);
  }, [realChildren, childMatchesRealChild, setChild]);

  const progressQuery = useQuery({
    queryKey: ['planner', 'progress', child.id],
    queryFn: () => getPlannerProgress(getToken, child.id),
    enabled: Boolean(isLoaded && userId && isRealChild && childMatchesRealChild),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!progressQuery.data) return;
    hydrateProgress(progressQuery.data);
  }, [progressQuery.data, hydrateProgress]);

  const qc = useQueryClient();
  const completeMutation = useMutation({
    mutationFn: async (moduleNumber: number) => {
      if (isRealChild) {
        return completeModuleApi(getToken, { childProfileId: child.id, moduleNumber });
      }
      markModuleCompletedLocally(moduleNumber);
      return {
        childProfileId: child.id,
        currentModuleNumber: Math.min(moduleNumber + 1, TOTAL_CURRICULUM_MODULES),
        completedModuleNumbers: Array.from(
          new Set([...completedModuleNumbers, moduleNumber]),
        ).sort((a, b) => a - b),
      };
    },
    onSuccess: (progress) => {
      hydrateProgress(progress);
      qc.invalidateQueries({ queryKey: ['planner', 'progress', child.id] });
    },
  });

  const ageYears = useMemo(() => ageInYearsFromBirth(child.birthDate), [child.birthDate]);
  const stageFromProfile = useMemo(
    () => getDevelopmentStageByAge(child.birthDate),
    [child.birthDate],
  );

  const clampedModuleNumber = Math.min(currentModuleNumber, TOTAL_CURRICULUM_MODULES);
  const currentModule =
    CURRICULUM_MODULES.find((m) => m.number === clampedModuleNumber) ?? CURRICULUM_MODULES[0]!;
  const currentIsCompleted = completedModuleNumbers.includes(currentModule.number);
  const allDone = completedModuleNumbers.length >= TOTAL_CURRICULUM_MODULES;
  const currentLocked = !canAccessFullPlanner && currentModule.number > 1;
  const upgradeError =
    completeMutation.error instanceof ApiError && completeMutation.error.status === 402
      ? completeMutation.error
      : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader logoHref={plannerHeader.logoHref} pageLabel="Planner" links={plannerHeader.links} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Plan Anual Edify
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            26 módulos · 7 Pilares del Desarrollo Integral
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Un módulo quincenal a la vez, en el orden pensado por el programa: primero se instalan
            los hábitos base del hogar, luego el entorno, luego la autonomía y por último la
            cultura familiar.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 space-y-5 lg:sticky lg:top-24 lg:max-w-xs">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-bold text-primary">Menor</h2>
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

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                  ~{ageYears.toFixed(1)} años
                </span>
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {stageFromProfile.label}
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
                        {c.displayName}
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
                    {PLANNER_DEMO_CHILDREN.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-bold text-primary">Progreso</h2>
              {progressQuery.isError ? (
                <p className="mt-1 text-xs font-medium text-red-800">
                  No pudimos cargar tu progreso guardado. Intenta recargar la página.
                </p>
              ) : null}
              <p className="mt-1 text-2xl font-bold text-foreground">
                Módulo {clampedModuleNumber}
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}
                  / {TOTAL_CURRICULUM_MODULES}
                </span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: `${(completedModuleNumbers.length / TOTAL_CURRICULUM_MODULES) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {completedModuleNumbers.length} de {TOTAL_CURRICULUM_MODULES} completados
              </p>
              {!canAccessFullPlanner ? (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Tu plan Semilla incluye el Módulo 1. Actualiza a{' '}
                  <Link
                    href="/#precios"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Familia
                  </Link>{' '}
                  para seguir con los {TOTAL_CURRICULUM_MODULES} módulos.
                </p>
              ) : null}
            </section>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            {allDone ? (
              <section className="rounded-2xl border border-accent/30 bg-accent-soft/20 px-5 py-8 text-center sm:px-8">
                <p className="text-lg font-bold text-primary">¡Plan Anual completo! 🎉</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {child.displayName} recorrió los {TOTAL_CURRICULUM_MODULES} módulos de los 7
                  Pilares.
                </p>
              </section>
            ) : (
              <ModuleDetailCard
                module={currentModule}
                isCompleted={currentIsCompleted}
                locked={currentLocked}
                onComplete={() => completeMutation.mutate(currentModule.number)}
                completing={completeMutation.isPending}
                upgradeError={upgradeError}
              />
            )}

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-lg font-bold text-primary">Los {TOTAL_CURRICULUM_MODULES} módulos</h2>
                <Link
                  href={consumerHubHref('resumen')}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Volver al panel familia
                </Link>
              </div>
              <div className="space-y-6">
                {EDIFY_BLOCK_IDS.map((blockId) => {
                  const block = EDIFY_BLOCKS[blockId];
                  const modules = CURRICULUM_MODULES.filter((m) => m.block === blockId);
                  return (
                    <div key={blockId}>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Bloque {block.order} · {block.label} ({block.months})
                      </p>
                      <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
                        {modules.map((m) => {
                          const done = completedModuleNumbers.includes(m.number);
                          const isCurrent = m.number === clampedModuleNumber && !allDone;
                          const locked = !canAccessFullPlanner && m.number > 1;
                          return (
                            <li
                              key={m.number}
                              className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${
                                isCurrent ? 'bg-accent-soft/20' : ''
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                    done
                                      ? 'bg-primary text-white'
                                      : isCurrent
                                        ? 'border-2 border-primary text-primary'
                                        : 'border border-border text-muted-foreground'
                                  }`}
                                >
                                  {done ? '✓' : m.number}
                                </span>
                                <span className="truncate font-medium text-foreground">
                                  {m.title}
                                </span>
                              </span>
                              {locked ? (
                                <span className="shrink-0 text-xs text-muted-foreground">🔒</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
