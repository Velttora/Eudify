'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type {
  EducatorDashboardSnapshot,
  EducatorSession,
  ProviderLaunchTask,
} from '@/features/educator-hub/domain/types';
import {
  formatMoneyMinor,
  formatPercent,
  formatSessionRange,
  formatShortDateTime,
} from '@/features/educator-hub/application/educator-format';
import {
  patchAppointment,
  type AppointmentRow,
} from '@/features/appointments/api/appointments-api';
import { AppointmentDetailModal } from '@/features/appointments/components/appointment-detail-modal';
import { PostSessionReviewModal } from '@/features/appointments/components/post-session-review-modal';
import { appointmentShowMeetingLink } from '@/features/appointments/lib/appointment-address';
import {
  appointmentNeedsReviewPrompt,
  appointmentReviewEligible,
} from '@/features/appointments/lib/post-session-review-prompt';
import {
  APPOINTMENT_STATUS_LABEL_ES,
  apptStatusBadgeClass,
  apptStatusCardClass,
} from '@/features/appointments/lib/appointment-status-ui';
import { Button, buttonStyles } from '@/shared/components/ui/button';
import { Field, Input } from '@/shared/components/ui/field';

function Surface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[var(--primary)]">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

function DashboardUpcomingSessions({
  sessions,
  appointmentRows,
}: {
  sessions: EducatorSession[];
  appointmentRows: AppointmentRow[];
}) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [meetDraftById, setMeetDraftById] = useState<Record<string, string>>({});

  const detailAppointment = useMemo(
    () => appointmentRows.find((a) => a.id === detailId) ?? null,
    [appointmentRows, detailId],
  );

  const patchMut = useMutation({
    mutationFn: (payload: {
      id: string;
      status?: AppointmentRow['status'];
      meetingUrl?: string;
    }) => {
      const { id, ...body } = payload;
      return patchAppointment(getToken, id, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'provider', 'me'] });
    },
  });

  const [reviewModalApptId, setReviewModalApptId] = useState<string | null>(null);

  const completeMut = useMutation({
    mutationFn: (payload: { id: string; status: 'COMPLETED' }) => {
      const { id, ...body } = payload;
      return patchAppointment(getToken, id, body);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['appointments', 'provider', 'me'] });
      setReviewModalApptId(data.id);
    },
  });

  const eligibleProviderReviews = useMemo(
    () =>
      appointmentRows
        .filter((a) => appointmentReviewEligible(a, 'PROVIDER'))
        .sort(
          (x, y) =>
            new Date(y.endsAt).getTime() - new Date(x.endsAt).getTime(),
        ),
    [appointmentRows],
  );

  useEffect(() => {
    if (reviewModalApptId != null) return;
    const next = eligibleProviderReviews.find((a) =>
      appointmentNeedsReviewPrompt(a, 'PROVIDER'),
    );
    if (next) setReviewModalApptId(next.id);
  }, [eligibleProviderReviews, reviewModalApptId]);

  const reviewModalAppointment = useMemo(
    () => appointmentRows.find((a) => a.id === reviewModalApptId) ?? null,
    [appointmentRows, reviewModalApptId],
  );

  if (sessions.length === 0) {
    return (
      <li className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">
        No tienes citas futuras pendientes o confirmadas. Publica disponibilidad y revisa solicitudes en{' '}
        <Link
          href="/dashboard/provider/agenda"
          className="font-semibold text-[var(--primary-soft)] underline underline-offset-2 hover:text-[var(--primary)]"
        >
          Agenda y horarios
        </Link>
        .
      </li>
    );
  }

  return (
    <>
      <AppointmentDetailModal
        open={detailId != null}
        onClose={() => setDetailId(null)}
        appointment={detailAppointment}
        viewerRole="PROVIDER"
      />
      {patchMut.isError || completeMut.isError ? (
        <li className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          {patchMut.error instanceof Error
            ? patchMut.error.message
            : completeMut.error instanceof Error
              ? completeMut.error.message
              : 'No se pudo actualizar la cita.'}
        </li>
      ) : null}
      {sessions.map((s) => {
        const pending = s.status === 'PENDING';
        const row = appointmentRows.find((a) => a.id === s.id);
        const showMeetOnConfirm =
          pending &&
          row &&
          appointmentShowMeetingLink({
            providerProfile: row.providerProfile,
            attendanceMode: row.attendanceMode ?? null,
          });
        const meetDraft = meetDraftById[s.id] ?? '';
        return (
          <li
            key={s.id}
            className={`cursor-pointer shadow-sm transition-shadow hover:ring-2 hover:ring-primary/20 ${apptStatusCardClass(s.status)}`}
            onClick={() => setDetailId(s.id)}
          >
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={apptStatusBadgeClass(s.status)}>
                    {APPOINTMENT_STATUS_LABEL_ES[s.status]}
                  </span>
                  {s.requestsAlternativeSchedule ? (
                    <span className="rounded-md border border-accent/40 bg-accent-soft/40 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Horario propuesto
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm font-semibold text-foreground">{s.childName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.offerTitle}
                  <span className="text-muted-foreground/70"> · </span>
                  {s.familyName}
                </p>
                {s.notes ? (
                  <p
                    className="line-clamp-2 rounded-md border border-border bg-background px-2 py-1 text-[11px] leading-snug text-foreground"
                    title={s.notes}
                  >
                    <span className="font-semibold text-primary">Nota: </span>
                    {s.notes}
                  </p>
                ) : null}
                <p className="text-[11px] font-medium text-primary underline-offset-2">
                  Toca la tarjeta para ver ubicación o enlace de reunión
                </p>
              </div>
              <div className="flex flex-col flex-wrap items-stretch gap-2 sm:shrink-0 sm:items-end">
                <p className="text-xs font-semibold tabular-nums text-primary sm:text-right">
                  {formatSessionRange(s.startsAt, s.endsAt)}
                </p>
                {pending ? (
                  <div
                    className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {showMeetOnConfirm ? (
                      <Field label="Enlace Meet / Zoom (opcional)">
                        <Input
                          value={meetDraft}
                          onChange={(e) =>
                            setMeetDraftById((m) => ({ ...m, [s.id]: e.target.value }))
                          }
                          placeholder="https://meet.google.com/…"
                          className="text-xs"
                        />
                      </Field>
                    ) : null}
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button
                        type="button"
                        variant="primary"
                        className="appt-btn-confirm-cta min-w-0 flex-1 px-3 py-1.5 text-xs sm:flex-initial sm:min-w-22"
                        disabled={patchMut.isPending || completeMut.isPending}
                        onClick={() =>
                          patchMut.mutate({
                            id: s.id,
                            status: 'CONFIRMED',
                            ...(meetDraft.trim()
                              ? { meetingUrl: meetDraft.trim() }
                              : {}),
                          })
                        }
                      >
                        {patchMut.isPending ? '…' : 'Confirmar'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-w-0 flex-1 px-3 py-1.5 text-xs sm:flex-initial sm:min-w-22"
                        disabled={patchMut.isPending || completeMut.isPending}
                        onClick={() => patchMut.mutate({ id: s.id, status: 'DECLINED' })}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ) : s.status === 'CONFIRMED' ? (
                  <div
                    className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {new Date(s.endsAt).getTime() <= Date.now() ? (
                      <Button
                        type="button"
                        variant="primary"
                        className="text-xs"
                        disabled={completeMut.isPending || patchMut.isPending}
                        onClick={() =>
                          completeMut.mutate({ id: s.id, status: 'COMPLETED' })
                        }
                      >
                        {completeMut.isPending ? '…' : 'Marcar como completada'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
      <PostSessionReviewModal
        open={reviewModalApptId != null}
        appointment={reviewModalAppointment}
        role="PROVIDER"
        getToken={getToken}
        onClose={() => setReviewModalApptId(null)}
        onUpdated={() => {
          qc.invalidateQueries({ queryKey: ['appointments', 'provider', 'me'] });
          qc.invalidateQueries({ queryKey: ['provider-profile'] });
        }}
      />
    </>
  );
}

const FIRST_TIME_CHECKLIST_STORAGE_KEY = 'eudify_provider_first_time_checklist_v2';

function ProviderLaunchBanner({ tasks }: { tasks: ProviderLaunchTask[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [storageRead, setStorageRead] = useState(false);

  useEffect(() => {
    try {
      setDismissed(
        window.sessionStorage.getItem(FIRST_TIME_CHECKLIST_STORAGE_KEY) === '1',
      );
    } catch {
      /* ignore */
    }
    setStorageRead(true);
  }, []);

  const pending = tasks.filter((t) => !t.done);

  if (!storageRead || dismissed || pending.length === 0) {
    return null;
  }

  return (
    <Surface className="border-(--accent)/35 bg-accent-soft/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            ¿Primera vez aquí?
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Prepara tu perfil para recibir tus primeras reservas
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Completa estos pasos básicos para que las familias entiendan tu propuesta,
            vean horarios disponibles, conozcan tus precios y puedan pagar reservas con confianza.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 self-start rounded-xl"
          onClick={() => {
            try {
              window.sessionStorage.setItem(FIRST_TIME_CHECKLIST_STORAGE_KEY, '1');
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          Ocultar por ahora
        </Button>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tasks.map((t, idx) => (
          <li
            key={t.id}
            className={`rounded-xl border p-4 ${
              t.done
                ? 'border-emerald-200/80 bg-emerald-50/50'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {idx + 1}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.done ? 'Listo' : 'Pendiente'}
              </p>
            </div>
            <p className="mt-1 font-semibold text-foreground">{t.label}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t.description}
            </p>
            {!t.done ? (
              <Link
                href={t.href}
                className={buttonStyles(
                  'primary',
                  'mt-3 inline-flex rounded-lg text-xs',
                )}
              >
                {t.cta}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Surface>
  );
}

const GROWTH_CTAS: { href: string; label: string; body: string }[] = [
  {
    href: '/dashboard/provider/ofertas',
    label: 'Ofertas',
    body: 'Cuando activemos el editor, aquí publicarás talleres y paquetes.',
  },
  {
    href: '/dashboard/provider/agenda',
    label: 'Agenda y horarios',
    body: 'Publica ventanas para que las familias puedan reservar contigo.',
  },
  {
    href: '/profile/provider',
    label: 'Mi perfil',
    body: 'Mantén bio, ciudad y datos de contacto al día.',
  },
  {
    href: '/dashboard/provider/estudiantes',
    label: 'Estudiantes',
    body: 'Seguimiento por alumno y familia (en desarrollo).',
  },
  {
    href: '/dashboard/provider/vitrina',
    label: 'Vitrina pública',
    body: 'Previsualiza cómo te ven las familias en tu ficha.',
  },
];

export function EducatorDashboardHome({
  snapshot,
  displayName,
  publicProfileId,
  appointmentRows,
}: {
  snapshot: EducatorDashboardSnapshot;
  displayName: string;
  publicProfileId: string | null;
  appointmentRows: AppointmentRow[];
}) {
  const {
    profile,
    kpis,
    upcomingSessions,
    leads,
    activeStudents,
    topOffers,
    recentReviews,
    reviewsLeftForFamilies,
    insights,
    profileCompletion,
    providerLaunchTasks,
  } = snapshot;
  const currency = profile.currency;

  const pendingRecommendations = profileCompletion.items.filter((i) => !i.done);

  return (
    <div className="space-y-8">
      <ProviderLaunchBanner tasks={providerLaunchTasks} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Hola, {displayName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            Citas reales y datos de tu perfil. Otras secciones se irán conectando a la medida que
            estén listas en la plataforma.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/dashboard/provider/ofertas"
            className={buttonStyles(
              'primary',
              'rounded-xl !bg-[var(--accent)] !text-[var(--primary)] hover:!bg-[var(--accent-hover)]',
            )}
          >
            Nueva oferta educativa
          </Link>
          {publicProfileId ? (
            <Link
              href={`/educadores/${publicProfileId}`}
              className="text-center text-sm font-medium text-[var(--primary-soft)] underline-offset-2 hover:underline"
            >
              Ver cómo te ven las familias
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Ingresos del mes (COP, estim.)"
          value={`${formatMoneyMinor(kpis.revenueMonthMinor, currency)} COP`}
          hint="Próximamente con pagos"
        />
        <Kpi label="Sesiones esta semana" value={String(kpis.sessionsThisWeek)} />
        <Kpi label="Leads nuevos" value={String(kpis.newLeads)} />
        <Kpi
          label="Conversión perfil → reserva"
          value={formatPercent(kpis.profileViewsToBookingRate)}
          hint="Métrica en desarrollo"
        />
        <Kpi
          label="Horas disponibles (sem.)"
          value={`${kpis.openHoursWeek} h`}
        />
        <Kpi label="Rating medio" value={kpis.avgRating.toFixed(2)} />
        <Kpi
          label="Retención"
          value={formatPercent(kpis.retentionRate, 0)}
          hint="Métrica en desarrollo"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Surface className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Próximas sesiones</h2>
            <Link
              href="/dashboard/provider/agenda"
              className="text-sm font-medium text-[var(--primary-soft)] hover:underline"
            >
              Ir a agenda
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            <DashboardUpcomingSessions
              sessions={upcomingSessions}
              appointmentRows={appointmentRows}
            />
          </ul>
        </Surface>

        <Surface>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Perfil completo</h2>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-4xl font-bold text-[var(--primary)]">{profileCompletion.scorePercent}</span>
            <span className="pb-1 text-sm text-[var(--muted-foreground)]">/ 100</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {profileCompletion.items.map((i) => (
              <li
                key={i.id}
                className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 ${
                  i.done ? 'bg-emerald-50/80 text-emerald-950' : 'bg-amber-50/80 text-amber-950'
                }`}
              >
                <span>{i.done ? '✓' : '○'} {i.label}</span>
                <span className="shrink-0 text-xs opacity-80">{i.impactLabel}</span>
              </li>
            ))}
          </ul>
          {pendingRecommendations.length ? (
            <p className="mt-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
              <span className="font-semibold text-[var(--foreground)]">Siguiente paso: </span>
              {pendingRecommendations[0]?.label}. {pendingRecommendations[0]?.impactLabel}.
            </p>
          ) : null}
          <Link
            href="/profile/provider"
            className={buttonStyles('secondary', 'mt-4 block w-full text-center rounded-xl')}
          >
            Editar datos públicos
          </Link>
        </Surface>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Solicitudes recientes</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {leads.length === 0 ? (
              <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Aún no hay mensajes de contacto centralizados aquí.
              </li>
            ) : null}
            {leads.map((l) => (
              <li key={l.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--foreground)]">{l.familyName}</p>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {formatShortDateTime(l.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{l.message}</p>
                <p className="mt-2 text-xs font-medium text-[var(--primary-soft)]">{l.interestedIn}</p>
                <button
                  type="button"
                  className={`${buttonStyles('primary', 'mt-3 rounded-lg !bg-[var(--primary)] hover:!bg-[var(--primary-hover)]')} text-xs py-2 px-3`}
                >
                  Responder solicitud
                </button>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Familias activas</h2>
            <Link href="/dashboard/provider/estudiantes" className="text-sm font-medium text-[var(--primary-soft)] hover:underline">
              Ver todas
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {activeStudents.length === 0 ? (
              <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Nadie con cita confirmada todavía. Confirma solicitudes en Agenda
                para ver familias aquí.
              </li>
            ) : null}
            {activeStudents.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/provider/estudiantes/${s.id}`}
                  className="block rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--accent)]"
                >
                  <p className="font-medium text-[var(--foreground)]">
                    {s.childFirstName}
                    {s.childAgeYears > 0 ? ` · ${s.childAgeYears} años` : ''}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">{s.familyName}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--muted-foreground)]">{s.progressSummary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      {insights.length > 0 ? (
        <Surface>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Insights de crecimiento</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Decisiones accionables basadas en el uso de la plataforma.
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {insights.map((i) => (
              <li
                key={i.id}
                className={`rounded-xl border p-4 ${
                  i.priority === 'high'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/25'
                    : 'border-[var(--border)] bg-[var(--background)]'
                }`}
              >
                <p className="font-semibold text-[var(--foreground)]">{i.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{i.body}</p>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Ofertas con mejor desempeño</h2>
          <ul className="mt-4 space-y-2">
            {topOffers.length === 0 ? (
              <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Crea y publica ofertas en «Ofertas»; cuando conectemos métricas al API, verás aquí las que mejor
                convierten.
              </li>
            ) : null}
            {topOffers.map((o) => (
              <li
                key={o.offerId}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <span className="font-medium text-[var(--foreground)]">{o.title}</span>
                <span className="text-sm text-[var(--muted-foreground)]">{o.bookings} reservas</span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/provider/ofertas"
            className={buttonStyles(
              'primary',
              'mt-4 inline-flex rounded-xl !bg-[var(--primary)] hover:!bg-[var(--primary-hover)]',
            )}
          >
            Gestionar ofertas
          </Link>
        </Surface>

        <Surface>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Lo que dicen las familias</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Valoraciones que las familias dejan sobre ti tras citas completadas.
          </p>
          <ul className="mt-4 space-y-3">
            {recentReviews.length === 0 ? (
              <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Cuando las familias valoren sesiones completadas, aparecerán aquí.
              </li>
            ) : null}
            {recentReviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-[var(--foreground)]">{r.authorName}</p>
                  <span className="text-sm text-amber-700">{r.rating} ★</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{r.excerpt}</p>
                {r.offerTitle ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{r.offerTitle}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      <Surface>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Tus valoraciones a familias</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Lo que registraste sobre cada familia al cerrar la sesión (solo tú lo ves en tu panel).
        </p>
        <ul className="mt-4 space-y-3">
          {reviewsLeftForFamilies.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
              Cuando completes una cita y envíes tu valoración a la familia, aparecerá aquí.
            </li>
          ) : null}
          {reviewsLeftForFamilies.map((r) => (
            <li key={r.id} className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-[var(--foreground)]">{r.familyDisplayName}</p>
                <span className="text-sm text-amber-700">{r.rating} ★</span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{r.excerpt}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
                {r.sessionHint ? <span>{r.sessionHint}</span> : null}
                <span>{r.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </Surface>

      <Surface>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Impulsa tu negocio esta semana</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          CTAs alineados a conversión, agenda y crecimiento de marca.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GROWTH_CTAS.map((c) => (
            <li key={c.href} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <Link href={c.href} className="font-semibold text-[var(--primary)] hover:underline">
                {c.label}
              </Link>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{c.body}</p>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
