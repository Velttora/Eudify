'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { listMyAppointments, patchAppointment } from '@/features/appointments/api/appointments-api';
import { AppointmentDetailModal } from '@/features/appointments/components/appointment-detail-modal';
import { PostSessionReviewModal } from '@/features/appointments/components/post-session-review-modal';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { ConsumerFamilyForm } from '@/features/consumer/components/consumer-family-form';
import { ConsumerLessonsCalendar } from '@/features/consumer/components/consumer-lessons-calendar';
import { ConsumerUpcomingAppointmentsPanel } from '@/features/consumer/components/consumer-upcoming-appointments-panel';
import { ConsumerPaymentsPanel } from '@/features/payments/components/consumer-payments-panel';
import {
  consumerHubHref,
  parseConsumerHubSection,
  type ConsumerHubSection,
} from '@/features/consumer/lib/consumer-hub';
import { getConsumerProfile } from '@/features/consumer/api/consumer-api';
import {
  appointmentStatusLabelEs,
  appointmentStatusNextStepEs,
  appointmentStatusVariant,
  apptStatusBadgeClass,
  apptStatusCardClass,
  apptStatusHistoryClass,
} from '@/features/appointments/lib/appointment-status-ui';
import {
  appointmentNeedsReviewPrompt,
  appointmentReviewEligible,
} from '@/features/appointments/lib/post-session-review-prompt';
import {
  appointmentPaymentRequiredMessage,
  appointmentPaymentRequiredTitle,
  appointmentRequiresPayment,
} from '@/features/appointments/lib/appointment-payment-ui';
import { pathAfterBootstrap } from '@/shared/lib/routing';
import { AppHeader } from '@/shared/components/app-header';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';

const terminalStatuses = new Set([
  'DECLINED',
  'CANCELLED_BY_FAMILY',
  'CANCELLED_BY_PROVIDER',
]);

function formatApptRange(isoStart: string, isoEnd: string) {
  try {
    const a = new Date(isoStart);
    const b = new Date(isoEnd);
    return `${a.toLocaleString('es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })} – ${b.toLocaleTimeString('es', { timeStyle: 'short' })}`;
  } catch {
    return `${isoStart} – ${isoEnd}`;
  }
}

function formatMemberSince(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

const SECTION_LABELS: Record<ConsumerHubSection, string> = {
  resumen: 'Resumen',
  familia: 'Familia y datos',
  citas: 'Citas',
  pagos: 'Pagos',
};

function ConsumerHubContent() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [detailApptId, setDetailApptId] = useState<string | null>(null);
  const [consumerReviewApptId, setConsumerReviewApptId] = useState<string | null>(null);

  const seccion = parseConsumerHubSection(searchParams.get('seccion'));

  const setSeccion = useCallback(
    (next: ConsumerHubSection) => {
      const href = consumerHubHref(next);
      router.replace(href, { scroll: false });
    },
    [router],
  );

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const profileQuery = useQuery({
    queryKey: ['consumer-profile'],
    queryFn: () => getConsumerProfile(getToken),
    enabled: bootstrapQuery.data?.user?.role === 'CONSUMER',
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'me'],
    queryFn: () => listMyAppointments(getToken),
    enabled: bootstrapQuery.data?.user?.role === 'CONSUMER',
    refetchInterval: 30_000,
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) =>
      patchAppointment(getToken, id, { status: 'CANCELLED_BY_FAMILY' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'me'] });
    },
  });

  useEffect(() => {
    const b = bootstrapQuery.data;
    if (!b) return;
    const next = pathAfterBootstrap(b);
    if (next !== '/dashboard/consumer') {
      router.replace(next);
    }
  }, [bootstrapQuery.data, router]);

  const displayName = useMemo(() => {
    const p = profileQuery.data;
    return (
      p?.fullName ||
      user?.firstName ||
      user?.primaryEmailAddress?.emailAddress ||
      'familia'
    );
  }, [profileQuery.data, user]);

  const appointmentsList = useMemo(
    () => appointmentsQuery.data ?? [],
    [appointmentsQuery.data],
  );

  const failedPaymentAppointments = useMemo(
    () => appointmentsList.filter((a) => appointmentRequiresPayment(a)),
    [appointmentsList],
  );

  const detailAppointment = useMemo(
    () => appointmentsList.find((a) => a.id === detailApptId) ?? null,
    [appointmentsList, detailApptId],
  );

  const eligibleConsumerReviews = useMemo(
    () =>
      appointmentsList
        .filter((a) => appointmentReviewEligible(a, 'CONSUMER'))
        .sort(
          (x, y) =>
            new Date(y.endsAt).getTime() - new Date(x.endsAt).getTime(),
        ),
    [appointmentsList],
  );

  useEffect(() => {
    if (consumerReviewApptId != null) return;
    const next = eligibleConsumerReviews.find((a) =>
      appointmentNeedsReviewPrompt(a, 'CONSUMER'),
    );
    if (next) setConsumerReviewApptId(next.id);
  }, [eligibleConsumerReviews, consumerReviewApptId]);

  const consumerReviewAppointment = useMemo(
    () => appointmentsList.find((a) => a.id === consumerReviewApptId) ?? null,
    [appointmentsList, consumerReviewApptId],
  );

  if (
    bootstrapQuery.isLoading ||
    profileQuery.isLoading ||
    appointmentsQuery.isLoading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-base text-muted-foreground">
        Cargando tu espacio…
      </div>
    );
  }

  if (
    bootstrapQuery.isError ||
    profileQuery.isError ||
    appointmentsQuery.isError ||
    !profileQuery.data
  ) {
    return (
      <div className="p-8 text-base text-red-700">
        No se pudo cargar tu tablero.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Reintentar
        </Link>
      </div>
    );
  }

  const profile = profileQuery.data;
  const bUser = bootstrapQuery.data?.user;
  const email =
    user?.primaryEmailAddress?.emailAddress ?? bUser?.email ?? '—';

  const now = new Date();
  const upcoming = appointmentsList.filter(
    (a) =>
      !terminalStatuses.has(a.status) && new Date(a.endsAt) >= now,
  );
  const history = appointmentsList.filter(
    (a) => terminalStatuses.has(a.status) || new Date(a.endsAt) < now,
  );

  const hubLinks = [
    {
      href: consumerHubHref('resumen'),
      label: 'Mi espacio',
      emphasized: true,
      replace: true,
    },
    { href: '/planner', label: 'Planner educativo' },
    { href: '/explorar', label: 'Educadores' },
    { href: '/dashboard/consumer/chat', label: 'Chat' },
    {
      href: consumerHubHref('familia'),
      label: 'Familia y datos',
      replace: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppointmentDetailModal
        open={detailApptId != null}
        onClose={() => setDetailApptId(null)}
        appointment={detailAppointment}
        viewerRole="CONSUMER"
      />
      <PostSessionReviewModal
        open={consumerReviewApptId != null}
        appointment={consumerReviewAppointment}
        role="CONSUMER"
        getToken={getToken}
        onClose={() => setConsumerReviewApptId(null)}
        onUpdated={() => {
          qc.invalidateQueries({ queryKey: ['appointments', 'me'] });
          qc.invalidateQueries({ queryKey: ['discover'] });
          qc.invalidateQueries({ queryKey: ['educador-public'] });
        }}
      />
      <AppHeader logoHref="/explorar" pageLabel="Familia" links={hubLinks} />
      <main className="mx-auto min-w-0 max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <nav
          className="sticky top-[68px] z-30 -mx-1 flex gap-2 overflow-x-auto overflow-y-hidden rounded-2xl border border-border bg-card/95 px-1 py-2 shadow-sm backdrop-blur-md scroll-smooth sm:top-[74px] sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-2"
          aria-label="Secciones del espacio familiar"
        >
          {(Object.keys(SECTION_LABELS) as ConsumerHubSection[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSeccion(key)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                seccion === key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {SECTION_LABELS[key]}
            </button>
          ))}
        </nav>

        {failedPaymentAppointments.length > 0 ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-sm">
            <p className="font-bold">{appointmentPaymentRequiredTitle()}</p>
            <p className="mt-1 leading-relaxed">
              {appointmentPaymentRequiredMessage(failedPaymentAppointments[0]!)}
              {failedPaymentAppointments.length > 1
                ? ` Tienes ${failedPaymentAppointments.length} citas con pago pendiente.`
                : ''}
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800 shadow-sm hover:bg-red-100"
              onClick={() => setSeccion('pagos')}
            >
              Actualizar método de pago
            </button>
          </section>
        ) : null}

        {seccion === 'resumen' ? (
          <>
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary sm:text-3xl">
                  Hola, {displayName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Un solo lugar para tu familia, datos y citas.
                </p>
              </div>
              <Button
                type="button"
                className="shrink-0"
                onClick={() => setSeccion('familia')}
              >
                Editar datos de la familia
              </Button>
            </header>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-primary">
                Tu espacio en un vistazo
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{email}</span>
                {profile.city ? (
                  <>
                    {' '}
                    · {profile.city}
                  </>
                ) : null}
                {profile.phone ? (
                  <>
                    {' '}
                    · {profile.phone}
                  </>
                ) : null}
                {bUser?.createdAt ? (
                  <>
                    {' '}
                    · En la plataforma desde {formatMemberSince(bUser.createdAt)}
                  </>
                ) : null}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.children.length === 0 ? (
                  <div className="w-full">
                    <EmptyState
                      icon="👧"
                      title="Aún no has agregado niños"
                      body="Agrega el primer beneficiario para que el educador pueda preparar la sesión y adaptar la experiencia."
                      actionLabel="Agregar niño"
                      onAction={() => setSeccion('familia')}
                    />
                  </div>
                ) : (
                  profile.children.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
                    >
                      {c.firstName} · {c.birthDate.slice(0, 10)}
                    </span>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => setSeccion('familia')}
                  className="text-xs font-semibold text-primary underline underline-offset-2"
                >
                  Editar familia
                </button>
              </div>
              <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-foreground">
                <span className="font-semibold text-primary">
                  Educational Planner:
                </span>{' '}
                roadmap por edad y categoría, con fundamento pedagógico y edición
                local.{' '}
                <Link
                  href="/planner"
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  Abrir planner
                </Link>
              </p>
            </section>

            <div className="space-y-4">
              <ConsumerUpcomingAppointmentsPanel
                appointments={upcoming}
                maxItems={3}
                emptyMessage="No tienes citas activas. Explora educadores y solicita una dentro de sus ventanas publicadas."
                emptyTitle="No tienes próximas sesiones"
                emptyActionLabel="Encontrar un educador"
                emptyActionHref="/explorar"
                onManageClick={() => setSeccion('citas')}
                manageLabel="Ver todas las citas"
                onSelectAppointment={(a) => setDetailApptId(a.id)}
              />
              <Link
                href="/explorar"
                className="inline-block text-sm font-semibold text-primary underline underline-offset-2"
              >
                Buscar educadores
              </Link>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-primary">
                    Calendario de lecciones
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Naranja: pendiente de confirmación del educador. Verde: cita confirmada.
                    Cambia a semana o lista para ver horarios con más detalle.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSeccion('citas')}
                  className="shrink-0 text-left text-sm font-semibold text-primary underline underline-offset-2 sm:text-right"
                >
                  Gestionar citas
                </button>
              </div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-medium text-foreground">Leyenda:</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="appt-legend-swatch appt-legend-swatch-pending" aria-hidden />
                    Pendiente
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="appt-legend-swatch appt-legend-swatch-confirmed"
                      aria-hidden
                    />
                    Confirmada
                  </span>
                </p>
                {profile.children.length > 0 ? (
                  <p>
                    <span className="font-medium text-foreground">Hijos: </span>
                    {profile.children.map((c) => c.firstName).join(', ')}
                  </p>
                ) : null}
              </div>
              <div className="mt-4">
                <ConsumerLessonsCalendar appointments={appointmentsList} />
              </div>
            </section>
          </>
        ) : null}

        {seccion === 'familia' ? (
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 text-sm text-muted-foreground"
              onClick={() => setSeccion('resumen')}
            >
              ← Volver al resumen
            </Button>
            <ConsumerFamilyForm />
          </div>
        ) : null}

        {seccion === 'citas' ? (
          <div className="space-y-5">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 text-sm text-muted-foreground"
              onClick={() => setSeccion('resumen')}
            >
              ← Volver al resumen
            </Button>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold text-primary">
                  Próximas citas
                </h2>
                <Link
                  href="/explorar"
                  className="text-sm font-semibold text-primary underline underline-offset-2"
                >
                  Buscar educadores
                </Link>
              </div>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-medium text-foreground">Estado:</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="appt-legend-swatch appt-legend-swatch-pending" aria-hidden />
                    Pendiente
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="appt-legend-swatch appt-legend-swatch-confirmed"
                      aria-hidden
                    />
                    Confirmada
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="appt-legend-swatch appt-legend-swatch-cancelled"
                      aria-hidden
                    />
                    Cerrada
                  </span>
                </p>
                {profile.children.length > 0 ? (
                  <p>
                    <span className="font-medium text-foreground">Hijos: </span>
                    {profile.children.map((c) => c.firstName).join(', ')}
                  </p>
                ) : null}
              </div>
              {upcoming.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon="📅"
                    title="No hay próximas sesiones"
                    body="Cuando encuentres un educador, solicita una cita desde su perfil y la verás aquí con su estado."
                    actionLabel="Buscar educadores"
                    actionHref="/explorar"
                  />
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {upcoming.map((a) => {
                    const statusVariant = appointmentStatusVariant(a);
                    const nextStep = appointmentStatusNextStepEs(a);
                    const requiresPayment = appointmentRequiresPayment(a);
                    return (
                      <li
                        key={a.id}
                        className={`cursor-pointer px-4 py-3 text-sm shadow-sm transition-shadow hover:ring-2 hover:ring-primary/20 ${apptStatusCardClass(statusVariant)}`}
                        onClick={() => setDetailApptId(a.id)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Para {a.child?.firstName ?? '—'}
                            </p>
                            <p className="font-semibold text-foreground">
                              {a.providerProfile.fullName?.trim() || 'Educador'}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {formatApptRange(a.startsAt, a.endsAt)}
                            </p>
                            <p className="mt-1.5">
                              <span className={apptStatusBadgeClass(statusVariant)}>
                                {appointmentStatusLabelEs(a)}
                              </span>
                            </p>
                            {nextStep ? (
                              <p className="mt-1 text-xs font-medium text-primary">
                                {nextStep}
                              </p>
                            ) : null}
                            {requiresPayment ? (
                              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                                <p className="font-bold">
                                  {appointmentPaymentRequiredTitle()}
                                </p>
                                <p className="mt-1 leading-relaxed">
                                  {appointmentPaymentRequiredMessage(a)}
                                </p>
                              </div>
                            ) : null}
                            <p className="mt-2 text-[11px] font-medium text-primary">
                              Toca para ver ubicación o enlace de videollamada
                            </p>
                          </div>
                          {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                            <Button
                              variant="secondary"
                              className="shrink-0 text-xs"
                              disabled={cancelMut.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelMut.mutate(a.id);
                              }}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-primary">
                Historial de citas
              </h2>
              {history.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon="🕘"
                    title="Aún no tienes historial"
                    body="Tus citas completadas, canceladas o cerradas aparecerán aquí después de tu primera reserva."
                    actionLabel="Ver educadores"
                    actionHref="/explorar"
                  />
                </div>
              ) : (
                <ul className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto text-sm text-muted-foreground">
                  {history.map((a) => {
                    const statusVariant = appointmentStatusVariant(a);
                    return (
                      <li
                        key={a.id}
                        className={`flex cursor-pointer flex-wrap justify-between gap-2 border-b border-border py-2 pl-2 last:border-0 hover:bg-muted/40 ${apptStatusHistoryClass(statusVariant)}`}
                        onClick={() => setDetailApptId(a.id)}
                      >
                        <span className="font-medium text-foreground">
                          {a.child?.firstName ?? '—'}
                          {' · '}
                          {a.providerProfile.fullName?.trim() || 'Educador'}
                        </span>
                        <span className="flex flex-col items-end gap-1 text-end text-xs sm:flex-row sm:items-center sm:gap-2">
                          <span>{formatApptRange(a.startsAt, a.endsAt)}</span>
                          <span className={apptStatusBadgeClass(statusVariant)}>
                            {appointmentStatusLabelEs(a)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        {seccion === 'pagos' ? (
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 text-sm text-muted-foreground"
              onClick={() => setSeccion('resumen')}
            >
              ← Volver al resumen
            </Button>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <ConsumerPaymentsPanel embedded />
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ConsumerHubFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8 text-muted-foreground">
      Cargando…
    </div>
  );
}

export default function ConsumerDashboardPage() {
  return (
    <Suspense fallback={<ConsumerHubFallback />}>
      <ConsumerHubContent />
    </Suspense>
  );
}
