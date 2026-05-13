import type { AppointmentRow } from '@/features/appointments/api/appointments-api';
import { formatMoneyMinor } from '@/features/educator-hub/application/educator-format';

export function appointmentRequiresPayment(appointment: AppointmentRow): boolean {
  return (
    appointment.status === 'CONFIRMED' &&
    appointment.payment?.status === 'FAILED'
  );
}

export function appointmentPaymentRequiredTitle(): string {
  return 'Payment required';
}

export function appointmentPaymentRequiredMessage(
  appointment: AppointmentRow,
): string {
  const amount = appointment.payment
    ? `${formatMoneyMinor(
        appointment.payment.amountMinor,
        appointment.payment.currency,
      )} ${appointment.payment.currency}`
    : 'el total pendiente';
  return `No pudimos procesar el pago de esta cita confirmada. Actualiza tu método de pago para cubrir ${amount}.`;
}
