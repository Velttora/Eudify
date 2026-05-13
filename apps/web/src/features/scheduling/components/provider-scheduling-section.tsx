'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  listMyAvailabilityBlocks,
} from '@/features/availability/api/availability-api';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { AvailabilityFullCalendar } from '@/features/scheduling/components/availability-full-calendar';
import {
  listProviderAppointments,
  patchAppointment,
  type AppointmentRow,
} from '@/features/appointments/api/appointments-api';
import { PostSessionReviewModal } from '@/features/appointments/components/post-session-review-modal';
import {
  APPOINTMENT_STATUS_LABEL_ES,
  apptStatusBadgeClass,
  apptStatusCardClass,
} from '@/features/appointments/lib/appointment-status-ui';
import {
  appointmentNeedsReviewPrompt,
  appointmentReviewEligible,
} from '@/features/appointments/lib/post-session-review-prompt';
import { ApiError } from '@/shared/lib/api';
import { Button } from '@/shared/components/ui/button';
import { Field, Input } from '@/shared/components/ui/field';

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

function blockRange(isoStart: string, isoEnd: string, isAllDay: boolean, tz: string) {
  const base = formatApptRange(isoStart, isoEnd);
  return isAllDay ? `${base} (día completo · ${tz})` : base;
}

function queryErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Error desconocido';
}

export function ProviderSchedulingSection() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const isProvider = bootstrapQuery.data?.user?.role === 'PROVIDER';

  const blocksQuery = useQuery({
    queryKey: ['availability', 'me', 'blocks'],
    queryFn: () => listMyAvailabilityBlocks(getToken),
    enabled: isProvider,
  });

  const apptsQuery = useQuery({
    queryKey: ['appointments', 'provider', 'me'],
    queryFn: () => listProviderAppointments(getToken),
    enabled: isProvider,
  });

  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [timezone, setTimezone] = useState(
    () =>
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC',
  );

  const createBlockMut = useMutation({
    mutationFn: (vars: {
      startsAt: string;
      endsAt: string;
      isAllDay: boolean;
    }) =>
      createAvailabilityBlock(getToken, {
        startsAt: vars.startsAt,
        endsAt: vars.endsAt,
        isAllDay: vars.isAllDay,
        timezone: timezone.trim() || 'UTC',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability', 'me', 'blocks'] });
      qc.invalidateQueries({ queryKey: ['provider-detail'] });
      setStartsLocal('');
      setEndsLocal('');
    },
  });

  const deleteBlockMut = useMutation({
    mutationFn: (id: string) => deleteAvailabilityBlock(getToken, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability', 'me', 'blocks'] });
      qc.invalidateQueries({ queryKey: ['provider-detail'] });
    },
  });

  const [reviewModalApptId, setReviewModalApptId] = useState<string | null>(null);

  const patchApptMut = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: AppointmentRow['status'];
    }) => patchAppointment(getToken, id, { status }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['appointments', 'provider', 'me'] });
      if (data.status === 'COMPLETED') {
        setReviewModalApptId(data.id);
      }
    },
  });

  const appointmentRows = useMemo(
    () => apptsQuery.data ?? [],
    [apptsQuery.data],
  );

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

  const pending = useMemo(
    () =>
      (apptsQuery.data ?? []).filter((a) => a.status === 'PENDING'),
    [apptsQuery.data],
  );

  const other = useMemo(
    () =>
      (apptsQuery.data ?? []).filter((a) => a.status !== 'PENDING'),
    [apptsQuery.data],
  );

  const calendarAppointments = appointmentRows;

  if (bootstrapQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Comprobando tu sesión…</p>
    );
  }

  if (bootstrapQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="font-semibold">No se pudo cargar tu sesión</p>
        <p className="mt-1">{queryErrorMessage(bootstrapQuery.error)}</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 text-xs"
          onClick={() => bootstrapQuery.refetch()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!isProvider) {
    return (
      <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
        Solo los educadores pueden gestionar disponibilidad y citas. Si acabas
        de cambiar de rol, vuelve a entrar o recarga la página.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {patchApptMut.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">No se pudo actualizar la cita</p>
          <p className="mt-1">{queryErrorMessage(patchApptMut.error)}</p>
          <p className="mt-2 text-xs text-red-800/90">
            Si choca con otra cita ya confirmada, cancela o reprograma la otra
            antes de confirmar esta.
          </p>
        </div>
      ) : null}

      <section className="appt-pending-panel overflow-hidden rounded-2xl border-2 shadow-sm">
        <div className="appt-pending-panel-header border-b px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Solicitudes pendientes
            </h2>
            {!apptsQuery.isLoading && !apptsQuery.isError && pending.length > 0 ? (
              <span
                className={`${apptStatusBadgeClass('PENDING')} px-2.5 py-0.5 text-xs tabular-nums`}
                aria-label={`${pending.length} solicitudes pendientes`}
              >
                {pending.length}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada solicitud va ligada al alumno o alumna. Confirma o rechaza para
            actualizar tu agenda.
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          {apptsQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-semibold">No se pudieron cargar las citas</p>
              <p className="mt-1">{queryErrorMessage(apptsQuery.error)}</p>
              <p className="mt-2 text-xs text-red-800/90">
                Si ves 401 o 403, la sesión puede haber caducado: cierra sesión y
                entra de nuevo. Si el mensaje es “User not found”, visita{' '}
                <span className="font-medium">Mi espacio</span> para sincronizar.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 text-xs"
                onClick={() => apptsQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : apptsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando citas…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {pending.map((a) => (
                  <li
                    key={a.id}
                    className={`p-4 shadow-sm ${apptStatusCardClass('PENDING')}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={apptStatusBadgeClass('PENDING')}>Pendiente</span>
                          {Boolean(a.requestsAlternativeSchedule) ? (
                            <span className="rounded-md border border-accent/40 bg-accent-soft/40 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Horario propuesto
                            </span>
                          ) : null}
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {a.child?.firstName ?? '— (sin indicar)'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Familia:{' '}
                          <span className="font-medium text-foreground">
                            {a.consumerProfile.fullName?.trim() || '—'}
                          </span>
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-primary">
                          {formatApptRange(a.startsAt, a.endsAt)}
                        </p>
                        {a.noteFromFamily ? (
                          <p className="line-clamp-3 rounded-lg border border-border bg-background px-3 py-2 text-xs leading-relaxed text-foreground">
                            <span className="font-semibold text-primary">Nota: </span>
                            {a.noteFromFamily}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          className="appt-btn-confirm-cta min-w-28 px-4 py-2 text-sm shadow-sm"
                          disabled={patchApptMut.isPending}
                          onClick={() =>
                            patchApptMut.mutate({ id: a.id, status: 'CONFIRMED' })
                          }
                        >
                          Confirmar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-w-28 px-4 py-2 text-sm"
                          disabled={patchApptMut.isPending}
                          onClick={() =>
                            patchApptMut.mutate({ id: a.id, status: 'DECLINED' })
                          }
                        >
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {patchApptMut.isPending ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Actualizando solicitud…
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-foreground">Disponibilidad (ventanas)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea bloques en los que las familias pueden pedir cita (incluye días
          completos para babysitting si lo necesitas).
        </p>
        <div className="mt-3 rounded-xl border border-accent/25 bg-accent-soft/20 px-3 py-2 text-xs text-foreground sm:text-sm">
          <p className="font-semibold">Calendario</p>
          <p className="mt-1 text-muted-foreground">
            En <span className="font-medium">Mes</span>,{' '}
            <span className="font-medium">Semana</span> o{' '}
            <span className="font-medium">Día</span>, arrastra para marcar una
            ventana. Las familias solo podrán reservar dentro de esos rangos.
            Pulsa un bloque <span className="font-medium text-foreground">azul</span>{' '}
            para eliminarlo; las citas se gestionan arriba en solicitudes u
            otras citas.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground sm:text-xs">
            <li className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-sm bg-primary"
                aria-hidden
              />
              <span>Ventana publicada (hueco libre para reservas)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="appt-legend-swatch appt-legend-swatch-pending"
                aria-hidden
              />
              <span>Solicitud pendiente</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="appt-legend-swatch appt-legend-swatch-confirmed"
                aria-hidden
              />
              <span>Cita confirmada</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="appt-legend-swatch appt-legend-swatch-cancelled"
                aria-hidden
              />
              <span>Rechazada o cancelada</span>
            </li>
          </ul>
        </div>
        {blocksQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-semibold">No se pudo cargar la disponibilidad</p>
            <p className="mt-1">{queryErrorMessage(blocksQuery.error)}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 text-xs"
              onClick={() => blocksQuery.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : blocksQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Cargando calendario…</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm sm:p-3">
            <AvailabilityFullCalendar
              blocks={blocksQuery.data ?? []}
              appointments={calendarAppointments}
              editable
              height={640}
              initialView="timeGridWeek"
              onCreateRange={(range) => createBlockMut.mutate(range)}
              onDeleteBlock={(id) => deleteBlockMut.mutate(id)}
            />
          </div>
        )}
        {createBlockMut.isError ? (
          <p className="mt-2 text-sm text-red-700">
            {createBlockMut.error instanceof Error
              ? createBlockMut.error.message
              : 'No se pudo crear el bloque'}
          </p>
        ) : null}
        <h3 className="mt-6 text-sm font-bold text-foreground">
          Añadir con fecha y hora manual
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Alternativa al arrastre: indica inicio y fin exactos (la zona horaria
          aplica también a los bloques creados desde el calendario).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Inicio">
            <Input
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
            />
          </Field>
          <Field label="Fin">
            <Input
              type="datetime-local"
              value={endsLocal}
              onChange={(e) => setEndsLocal(e.target.value)}
            />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
          />
          Marcar como día completo (referencia de zona)
        </label>
        <Field label="Zona horaria (IANA)">
          <Input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Europe/Madrid"
          />
        </Field>
        <Button
          className="mt-3"
          variant="primary"
          disabled={
            createBlockMut.isPending || !startsLocal || !endsLocal
          }
          onClick={() =>
            createBlockMut.mutate({
              startsAt: new Date(startsLocal).toISOString(),
              endsAt: new Date(endsLocal).toISOString(),
              isAllDay,
            })
          }
        >
          {createBlockMut.isPending ? 'Guardando…' : 'Añadir ventana'}
        </Button>

        <h3 className="mt-6 text-sm font-bold text-foreground">Ventanas guardadas (lista)</h3>
        {(blocksQuery.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no hay ventanas. Las familias solo pueden solicitar citas dentro
            de estos rangos.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(blocksQuery.data ?? []).map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  {blockRange(b.startsAt, b.endsAt, b.isAllDay, b.timezone)}
                </span>
                <button
                  type="button"
                  className="text-xs font-semibold text-red-700 underline"
                  disabled={deleteBlockMut.isPending}
                  onClick={() => deleteBlockMut.mutate(b.id)}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-foreground">Otras citas</h2>
        {other.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Confirmadas y cerradas aparecerán aquí.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {other.map((a) => (
              <li
                key={a.id}
                className={`flex flex-col gap-2 rounded-lg px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${apptStatusCardClass(a.status)}`}
              >
                <span className="font-medium text-foreground">
                  <span className="text-primary">
                    {a.child?.firstName ?? '—'}
                  </span>
                  {' · '}
                  {a.consumerProfile.fullName?.trim() || 'Familia'}
                </span>
                <span className="flex flex-col gap-1 text-end text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-xs sm:text-sm">
                    {formatApptRange(a.startsAt, a.endsAt)}
                  </span>
                  <span className={`${apptStatusBadgeClass(a.status)} self-end sm:self-auto`}>
                    {APPOINTMENT_STATUS_LABEL_ES[a.status]}
                  </span>
                </span>
                {a.status === 'CONFIRMED' ? (
                  <div className="flex flex-col gap-2 self-start">
                    {new Date(a.endsAt).getTime() <= Date.now() ? (
                      <Button
                        variant="primary"
                        className="text-xs"
                        disabled={patchApptMut.isPending}
                        onClick={() =>
                          patchApptMut.mutate({
                            id: a.id,
                            status: 'COMPLETED',
                          })
                        }
                      >
                        {patchApptMut.isPending ? '…' : 'Marcar como completada'}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-xs text-red-800"
                        disabled={patchApptMut.isPending}
                        onClick={() =>
                          patchApptMut.mutate({
                            id: a.id,
                            status: 'CANCELLED_BY_PROVIDER',
                          })
                        }
                      >
                        Cancelar cita
                      </Button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

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
    </div>
  );
}
