'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import {
  CURRICULUM_MODULES,
  PILAR_COLORS,
  PILAR_IDS,
  PILAR_LABELS,
  TOTAL_CURRICULUM_MODULES,
} from '@repo/educational-planner';
import { useBootstrapQuery } from '@/features/bootstrap/hooks/use-bootstrap';
import { getPlannerProgress } from '@/features/educational-planner/planner-api';
import { getMyPlan } from '@/features/subscriptions/api/subscriptions-api';

const cardStyle = {
  background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-3) 100%)',
};

/** Banner de descubrimiento para el Plan Anual — visibilidad fuera de "Mi espacio" (ej. /explorar). */
export function PlanAnualPromo() {
  const { userId, isLoaded, getToken } = useAuth();

  const bootstrapQuery = useBootstrapQuery({ enabled: Boolean(isLoaded && userId) });
  const boot = bootstrapQuery.data;
  const isConsumer =
    boot?.user?.role === 'CONSUMER' && !boot.needsRoleSelection && !boot.needsOnboarding;
  const firstChildId = boot?.consumerProfile?.children?.[0]?.id ?? null;

  const myPlanQuery = useQuery({
    queryKey: ['subscriptions', 'me'],
    queryFn: () => getMyPlan(getToken),
    enabled: Boolean(isLoaded && userId && isConsumer),
    staleTime: 60 * 1000,
  });
  const hasFullPlan = myPlanQuery.data ? myPlanQuery.data.plan !== 'SEMILLA' : false;

  const progressQuery = useQuery({
    queryKey: ['planner', 'progress', firstChildId],
    queryFn: () => getPlannerProgress(getToken, firstChildId as string),
    enabled: Boolean(isLoaded && userId && isConsumer && hasFullPlan && firstChildId),
    staleTime: 60 * 1000,
  });

  const completedCount = progressQuery.data?.completedModuleNumbers.length ?? 0;
  const hasStarted = hasFullPlan && completedCount > 0;

  if (hasStarted && progressQuery.data) {
    const allDone = completedCount >= TOTAL_CURRICULUM_MODULES;
    const currentModuleNumber = Math.min(
      progressQuery.data.currentModuleNumber,
      TOTAL_CURRICULUM_MODULES,
    );
    const currentModule = CURRICULUM_MODULES.find((m) => m.number === currentModuleNumber);

    return (
      <section
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm sm:p-8"
        style={cardStyle}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--accent)' }}
        >
          Plan Anual Edify
        </p>
        {allDone ? (
          <h2 className="mt-2 max-w-xl text-xl font-bold sm:text-2xl">
            ¡Completaron los {TOTAL_CURRICULUM_MODULES} módulos del Plan Anual! 🎉
          </h2>
        ) : (
          <>
            <h2 className="mt-2 max-w-xl text-xl font-bold sm:text-2xl">
              Van en el Módulo {currentModuleNumber} de {TOTAL_CURRICULUM_MODULES}
              {currentModule ? `: ${currentModule.title}` : ''}
            </h2>
            <div className="mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white/15">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(completedCount / TOTAL_CURRICULUM_MODULES) * 100}%`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </div>
            <p className="mt-2 text-sm text-white/75">
              {completedCount} de {TOTAL_CURRICULUM_MODULES} módulos completados
            </p>
          </>
        )}

        <Link
          href="/planner"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm transition hover:bg-white/90"
          style={{ color: 'var(--navy)' }}
        >
          {allDone ? 'Ver la malla curricular →' : 'Continuar →'}
        </Link>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm sm:p-8"
      style={cardStyle}
    >
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
        Plan Anual Edify
      </p>
      <h2 className="mt-2 max-w-xl text-xl font-bold sm:text-2xl">
        {TOTAL_CURRICULUM_MODULES} módulos para instalar hábitos reales en los 7 Pilares del
        Desarrollo
      </h2>
      <p className="mt-2 max-w-xl text-sm text-white/75">
        Un módulo quincenal, en orden, con actividades para el niño y la familia, indicadores de
        progreso y fundamento científico. El Módulo 1 es gratis.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {PILAR_IDS.map((p) => (
          <span
            key={p}
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: PILAR_COLORS[p].bg, color: PILAR_COLORS[p].color }}
          >
            {PILAR_LABELS[p]}
          </span>
        ))}
      </div>

      <Link
        href="/planner"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm transition hover:bg-white/90"
        style={{ color: 'var(--navy)' }}
      >
        Ver el Plan Anual →
      </Link>
    </section>
  );
}
