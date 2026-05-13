'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import {
  patchAppointment,
  type AppointmentRow,
} from '@/features/appointments/api/appointments-api';
import {
  appointmentStatusLabelEs,
  appointmentStatusNextStepEs,
  appointmentStatusVariant,
  apptStatusBadgeClass,
  apptStatusCardClass,
} from '@/features/appointments/lib/appointment-status-ui';
import { Button } from '@/shared/components/ui/button';

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

export function ConsumerUpcomingAppointmentsPanel({
  appointments,
  maxItems = 3,
  title = 'Próximas citas',
  emptyMessage,
  manageHref,
  manageLabel = 'Ver todas las citas',
  onManageClick,
  onSelectAppointment,
}: {
  appointments: AppointmentRow[];
  maxItems?: number;
  title?: string;
  emptyMessage?: string;
  manageHref?: string;
  manageLabel?: string;
  onManageClick?: () => void;
  /** Si se define, la tarjeta abre el detalle (p. ej. modal en el padre). */
  onSelectAppointment?: (a: AppointmentRow) => void;
}) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const cancelMut = useMutation({
    mutationFn: (id: string) =>
      patchAppointment(getToken, id, { status: 'CANCELLED_BY_FAMILY' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'me'] });
    },
  });

  const rows = appointments.slice(0, maxItems);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-primary">{title}</h2>
        {manageHref ? (
          <Link
            href={manageHref}
            className="text-left text-sm font-semibold text-primary underline underline-offset-2 sm:text-right"
          >
            {manageLabel}
          </Link>
        ) : onManageClick ? (
          <button
            type="button"
            onClick={onManageClick}
            className="text-left text-sm font-semibold text-primary underline underline-offset-2 sm:text-right"
          >
            {manageLabel}
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {emptyMessage ??
            'No hay citas en este listado. Explora educadores y solicita una dentro de sus ventanas publicadas.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((a) => {
            const statusVariant = appointmentStatusVariant(a);
            const nextStep = appointmentStatusNextStepEs(a);
            return (
              <li
                key={a.id}
                className={`px-4 py-3 text-sm ${apptStatusCardClass(statusVariant)} ${
                  onSelectAppointment
                    ? 'cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/20'
                    : ''
                }`}
                onClick={() => onSelectAppointment?.(a)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div
                    role={onSelectAppointment ? 'button' : undefined}
                    className="min-w-0 flex-1"
                  >
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
                    {onSelectAppointment ? (
                      <p className="mt-2 text-[11px] font-medium text-primary underline-offset-2">
                        Toca para ver ubicación o enlace de videollamada
                      </p>
                    ) : null}
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
  );
}
