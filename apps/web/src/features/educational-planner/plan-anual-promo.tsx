import Link from 'next/link';

import {
  PILAR_COLORS,
  PILAR_IDS,
  PILAR_LABELS,
  TOTAL_CURRICULUM_MODULES,
} from '@repo/educational-planner';

/** Banner de descubrimiento para el Plan Anual — visibilidad fuera de "Mi espacio" (ej. /explorar). */
export function PlanAnualPromo() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm sm:p-8"
      style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-3) 100%)' }}
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
