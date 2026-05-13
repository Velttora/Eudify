import type { AppointmentRow } from '@/features/appointments/api/appointments-api';

export type AppointmentStatus = AppointmentRow['status'];
export type AppointmentStatusVariant =
  | AppointmentStatus
  | 'PENDING_ALTERNATIVE_SCHEDULE';

type AppointmentStatusInput = Pick<
  AppointmentRow,
  'status' | 'requestsAlternativeSchedule'
>;

export const APPOINTMENT_STATUS_LABEL_ES: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente de confirmación',
  CONFIRMED: 'Confirmada',
  DECLINED: 'Rechazada',
  CANCELLED_BY_FAMILY: 'Cancelada (familia)',
  CANCELLED_BY_PROVIDER: 'Cancelada (educador)',
  COMPLETED: 'Completada',
};

export const APPOINTMENT_STATUS_VARIANT_LABEL_ES: Record<
  AppointmentStatusVariant,
  string
> = {
  ...APPOINTMENT_STATUS_LABEL_ES,
  PENDING_ALTERNATIVE_SCHEDULE: 'Pendiente - horario alternativo solicitado',
};

export function appointmentStatusVariant(
  appointment: AppointmentStatusInput,
): AppointmentStatusVariant {
  if (
    appointment.status === 'PENDING' &&
    Boolean(appointment.requestsAlternativeSchedule)
  ) {
    return 'PENDING_ALTERNATIVE_SCHEDULE';
  }
  return appointment.status;
}

export function appointmentStatusLabelEs(
  appointment: AppointmentStatusInput,
): string {
  return APPOINTMENT_STATUS_VARIANT_LABEL_ES[
    appointmentStatusVariant(appointment)
  ];
}

export function appointmentStatusNextStepEs(
  appointment: AppointmentStatusInput,
  viewerRole: 'CONSUMER' | 'PROVIDER' = 'CONSUMER',
): string | null {
  if (appointmentStatusVariant(appointment) !== 'PENDING_ALTERNATIVE_SCHEDULE') {
    return null;
  }
  if (viewerRole === 'PROVIDER') {
    return 'La familia propuso un horario alternativo. Revisa la hora solicitada y confirma o rechaza la cita.';
  }
  return 'Tu solicitud está pendiente: el educador revisará el horario propuesto y confirmará o rechazará la cita.';
}

/** Tarjetas / filas con borde y fondo suave según estado. */
export function apptStatusCardClass(status: AppointmentStatusVariant): string {
  if (status === 'PENDING_ALTERNATIVE_SCHEDULE') {
    return 'appt-status-card appt-status-card-pending appt-status-card-pending-alt';
  }
  if (status === 'PENDING') return 'appt-status-card appt-status-card-pending';
  if (status === 'CONFIRMED') return 'appt-status-card appt-status-card-confirmed';
  if (status === 'COMPLETED') return 'appt-status-card appt-status-card-confirmed';
  return 'appt-status-card appt-status-card-cancelled';
}

/** Historial: acento lateral por estado. */
export function apptStatusHistoryClass(status: AppointmentStatusVariant): string {
  if (status === 'PENDING_ALTERNATIVE_SCHEDULE') {
    return 'appt-status-history appt-status-history-pending appt-status-history-pending-alt';
  }
  if (status === 'PENDING') return 'appt-status-history appt-status-history-pending';
  if (status === 'CONFIRMED') return 'appt-status-history appt-status-history-confirmed';
  if (status === 'COMPLETED') return 'appt-status-history appt-status-history-confirmed';
  return 'appt-status-history appt-status-history-cancelled';
}

/** Pastilla compacta de estado (listados, cabeceras de tarjeta). */
export function apptStatusBadgeClass(status: AppointmentStatusVariant): string {
  if (status === 'PENDING_ALTERNATIVE_SCHEDULE') {
    return 'appt-status-badge appt-status-badge-pending appt-status-badge-pending-alt';
  }
  if (status === 'PENDING') return 'appt-status-badge appt-status-badge-pending';
  if (status === 'CONFIRMED') return 'appt-status-badge appt-status-badge-confirmed';
  if (status === 'COMPLETED') return 'appt-status-badge appt-status-badge-confirmed';
  return 'appt-status-badge appt-status-badge-cancelled';
}

/** Eventos FullCalendar (familia): colores por estado, no por hijo. */
export function apptCalendarEventClasses(
  status: AppointmentStatus,
  requestsAlternativeSchedule = false,
): string[] {
  let cal = 'appt-cal-confirmed';
  if (status === 'PENDING') cal = 'appt-cal-pending';
  else if (status === 'COMPLETED') {
    cal = 'appt-cal-confirmed';
  } else if (
    status === 'DECLINED' ||
    status === 'CANCELLED_BY_FAMILY' ||
    status === 'CANCELLED_BY_PROVIDER'
  ) {
    cal = 'appt-cal-cancelled';
  }
  return [
    'consumer-appt-cal-event',
    cal,
    ...(status === 'PENDING' && requestsAlternativeSchedule
      ? ['appt-cal-pending-alt']
      : []),
  ];
}
