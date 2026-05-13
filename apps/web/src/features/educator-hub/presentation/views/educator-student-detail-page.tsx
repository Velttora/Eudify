'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { EducatorStudent, StudentRoadmapSummary } from '@/features/educator-hub/domain/types';
import {
  formatRoadmapBlockStatus,
  formatShortDateTime,
} from '@/features/educator-hub/application/educator-format';
import { buttonStyles } from '@/shared/components/ui/button';

export function EducatorStudentDetailPage({
  student,
  roadmap,
}: {
  student: EducatorStudent;
  roadmap: StudentRoadmapSummary | null;
}) {
  const [notes, setNotes] = useState(student.privateNotes);

  return (
    <div className="space-y-8">
      <div>
        <nav
          className="flex min-w-0 items-center gap-2 text-sm"
          aria-label="Breadcrumb"
        >
          <Link
            href="/dashboard/provider/estudiantes"
            className="shrink-0 font-medium text-primary underline-offset-2 hover:underline"
          >
            Estudiantes
          </Link>
          <span className="text-muted-foreground" aria-hidden>
            /
          </span>
          <span className="min-w-0 truncate font-medium text-foreground">
            {student.childFirstName}
          </span>
        </nav>
        <header className="mt-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            {student.childFirstName} · {student.childAgeYears} años
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {student.familyName} · {student.developmentStageLabel}
          </p>
        </header>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Objetivos e intereses</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-[var(--muted-foreground)]">
            {student.learningGoals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">Intereses: </span>
            {student.interests.join(', ')}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Historial breve</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2 rounded-lg bg-[var(--muted)]/60 px-3 py-2">
              <dt className="text-[var(--muted-foreground)]">Última sesión</dt>
              <dd className="font-medium">
                {student.lastSessionAt ? formatShortDateTime(student.lastSessionAt) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2 rounded-lg bg-[var(--muted)]/60 px-3 py-2">
              <dt className="text-[var(--muted-foreground)]">Próxima sesión</dt>
              <dd className="font-medium">
                {student.nextSessionAt ? formatShortDateTime(student.nextSessionAt) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2 rounded-lg bg-[var(--muted)]/60 px-3 py-2">
              <dt className="text-[var(--muted-foreground)]">Sesiones totales</dt>
              <dd className="font-medium">{student.sessionsCount}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">Progreso: </span>
            {student.progressSummary}
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Notas privadas</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Solo tú las ves. Se guardará en servidor al conectar el endpoint.
        </p>
        <textarea
          className="mt-3 min-h-[120px] w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="button" className={buttonStyles('secondary', 'mt-3 rounded-lg text-xs')}>
          Guardar borrador local
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Planner y roadmap</h2>
          <span className="rounded-full bg-[var(--accent-soft)]/40 px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
            Colaboración plataforma + familia + tú
          </span>
        </div>
        {roadmap ? (
          <>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{roadmap.planTitle}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{roadmap.categoryLabel}</p>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              <span className="font-semibold text-[var(--foreground)]">Tu observación: </span>
              {roadmap.educatorNotes}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Última colaboración: {formatShortDateTime(roadmap.lastCollaborationAt)}
            </p>
            <ul className="mt-4 space-y-3">
              {roadmap.blocks.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--foreground)]">{b.title}</p>
                    <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium">
                      {formatRoadmapBlockStatus(b.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{b.rationale}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={buttonStyles('ghost', 'rounded-lg text-xs py-1.5 px-2')}>
                      Marcar progreso
                    </button>
                    <button type="button" className={buttonStyles('ghost', 'rounded-lg text-xs py-1.5 px-2')}>
                      Sugerir ajuste
                    </button>
                    <button type="button" className={buttonStyles('ghost', 'rounded-lg text-xs py-1.5 px-2')}>
                      Añadir bloque
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              Historial de cambios: próximamente línea de tiempo con autor (plataforma, familia, educador).
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Aún no hay roadmap vinculado. Desde el planner familiar se podrá invitar a colaborar.
          </p>
        )}
      </section>
    </div>
  );
}
