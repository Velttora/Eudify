'use client';

import { useMemo, useState } from 'react';

import {
  CURRICULUM_MODULES,
  EDIFY_BLOCKS,
  EDIFY_BLOCK_IDS,
  PILAR_COLORS,
  PILAR_IDS,
  PILAR_LABELS,
  type CurriculumModule,
  type PilarId,
} from '@repo/educational-planner';

function modulePilares(m: CurriculumModule): PilarId[] {
  return [...m.pilarPrincipal, ...(m.pilaresSecundarios ?? [])];
}

/**
 * Malla curricular tipo "pensum universitario": los 4 bloques como columnas, los 26
 * módulos como tarjetas. Al hacer clic en un módulo se resaltan los demás que
 * comparten al menos un pilar con él (los pilares "se repiten en otras áreas" del
 * documento fuente) y se atenúan los que no tienen relación.
 */
export function CurriculumMap({
  completedModuleNumbers,
  currentModuleNumber,
  lockedAfterModule,
}: {
  completedModuleNumbers: number[];
  currentModuleNumber: number;
  /** Módulos con number > este valor se muestran con candado (plan sin acceso completo). */
  lockedAfterModule: number | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const selectedModule = useMemo(
    () => (selected != null ? CURRICULUM_MODULES.find((m) => m.number === selected) : null),
    [selected],
  );

  const relatedPilares = useMemo(
    () => (selectedModule ? new Set(modulePilares(selectedModule)) : null),
    [selectedModule],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          7 Pilares
        </p>
        {PILAR_IDS.map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5 text-xs text-foreground">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PILAR_COLORS[p].swatch }}
              aria-hidden
            />
            {PILAR_LABELS[p]}
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EDIFY_BLOCK_IDS.map((blockId) => {
          const block = EDIFY_BLOCKS[blockId];
          const modules = CURRICULUM_MODULES.filter((m) => m.block === blockId);
          return (
            <div key={blockId} className="min-w-0 space-y-2.5">
              <div className="px-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Bloque {block.order} · {block.months}
                </p>
                <p className="text-sm font-bold text-primary">{block.label}</p>
              </div>

              {modules.map((m) => {
                const done = completedModuleNumbers.includes(m.number);
                const isCurrent = m.number === currentModuleNumber;
                const locked = lockedAfterModule != null && m.number > lockedAfterModule;
                const pilares = modulePilares(m);
                const isSelected = selected === m.number;
                const isRelated =
                  relatedPilares != null &&
                  !isSelected &&
                  pilares.some((p) => relatedPilares.has(p));
                const isDimmed = relatedPilares != null && !isSelected && !isRelated;

                return (
                  <button
                    key={m.number}
                    type="button"
                    onClick={() => setSelected((cur) => (cur === m.number ? null : m.number))}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40'
                        : isRelated
                          ? 'border-accent bg-accent-soft/25 shadow-sm'
                          : 'border-border bg-background hover:border-primary/30'
                    } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
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
                      {locked ? (
                        <span className="text-xs text-muted-foreground" aria-hidden>
                          🔒
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                      {m.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pilares.map((p) => (
                        <span
                          key={p}
                          title={PILAR_LABELS[p]}
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: PILAR_COLORS[p].swatch }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {selectedModule ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Módulo {selectedModule.number} · {selectedModule.title}
              </p>
              <p className="mt-1 max-w-2xl text-sm text-foreground">
                {selectedModule.focoPractica}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cerrar
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Comparte pilares con los módulos resaltados arriba — así se repiten los mismos
            ejes del desarrollo a lo largo del año.
          </p>
        </div>
      ) : null}
    </div>
  );
}
