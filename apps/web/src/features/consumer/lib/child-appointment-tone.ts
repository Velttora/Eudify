import type { CSSProperties } from 'react';

const CONSUMER_APPOINTMENT_TONES = [
  { color: '#1565b8', borderColor: '#0d4a8c' },
  { color: '#0f766e', borderColor: '#0b5c54' },
  { color: '#6d28d9', borderColor: '#5b21b6' },
  { color: '#be185d', borderColor: '#9d174d' },
  { color: '#d97706', borderColor: '#d97706' },
  { color: '#047857', borderColor: '#065f46' },
  { color: '#0369a1', borderColor: '#075985' },
  { color: '#4338ca', borderColor: '#3730a3' },
] as const;

const UNKNOWN_TONE = { color: '#64748b', borderColor: '#475569' } as const;

const TONE_COUNT = CONSUMER_APPOINTMENT_TONES.length;

export type AppointmentChildToneStyle = CSSProperties & {
  '--consumer-appt-color': string;
  '--consumer-appt-border-color': string;
  '--consumer-appt-text-color': string;
};

/**
 * Índice de color estable por hijo (misma familia → mismo color en calendario y listas).
 */
export function childIdToToneIndex(childId: string | null): number {
  if (!childId) return -1;
  let h = 0;
  for (let i = 0; i < childId.length; i++) {
    h = (Math.imul(31, h) + childId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % TONE_COUNT;
}

/** Clase base para borde de tarjeta, texto de hijo y eventos FullCalendar. */
export function appointmentChildToneClass(childId: string | null): string {
  const idx = childIdToToneIndex(childId);
  return idx < 0
    ? 'consumer-appt-tone consumer-appt-tone-unknown'
    : 'consumer-appt-tone';
}

export function appointmentChildToneStyle(
  childId: string | null,
): AppointmentChildToneStyle {
  const idx = childIdToToneIndex(childId);
  const tone = idx < 0 ? UNKNOWN_TONE : CONSUMER_APPOINTMENT_TONES[idx];
  return {
    '--consumer-appt-color': tone.color,
    '--consumer-appt-border-color': tone.borderColor,
    '--consumer-appt-text-color': '#fff',
  };
}

export function appointmentChildToneProps(childId: string | null): {
  className: string;
  style: AppointmentChildToneStyle;
} {
  return {
    className: appointmentChildToneClass(childId),
    style: appointmentChildToneStyle(childId),
  };
}
