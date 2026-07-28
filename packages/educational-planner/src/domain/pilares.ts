import type { PilarId } from './types';

export const PILAR_IDS: PilarId[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

export const PILAR_LABELS: Record<PilarId, string> = {
  P1: 'Aire & Regulación',
  P2: 'Tierra & Naturaleza',
  P3: 'Luz & Ritmos',
  P4: 'Agua e Hidratación',
  P5: 'Alimentación',
  P6: 'Emociones & Neuro',
  P7: 'Movimiento & Fascia',
};

/** Mismos colores que el diagnóstico de onboarding (pillar-diagnostic-step) para consistencia visual. */
export const PILAR_COLORS: Record<PilarId, { color: string; bg: string }> = {
  P1: { color: '#0D5E9E', bg: '#EBF5FE' },
  P2: { color: '#1A7A2E', bg: '#EAF5EC' },
  P3: { color: '#9C6700', bg: '#FEF8E6' },
  P4: { color: '#1060A0', bg: '#E8F4FD' },
  P5: { color: '#1e5f8a', bg: '#EBF5FE' },
  P6: { color: '#6130A0', bg: '#F3EEF9' },
  P7: { color: '#A0321E', bg: '#FEF0ED' },
};
