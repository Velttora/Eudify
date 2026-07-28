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

/**
 * Paleta categórica validada (daltonismo + contraste) con el validador de la skill de
 * dataviz — la anterior tenía 2 pares casi indistinguibles para daltonismo y 2 azules
 * casi iguales incluso con visión normal. `swatch` es el color sólido (dots, íconos);
 * `color`/`bg` es el par texto-sobre-tinte-pálido para chips (mismo hue que `swatch`).
 * Los 3 colores marcados abajo caen bajo 3:1 contra fondo blanco puro: por eso nunca se
 * usan solos — siempre acompañados de una etiqueta de texto (ver skill dataviz).
 */
export const PILAR_COLORS: Record<PilarId, { swatch: string; color: string; bg: string }> = {
  P1: { swatch: '#2a78d6', color: '#1c5cab', bg: '#EAF2FC' },
  P2: { swatch: '#eb6834', color: '#c14f22', bg: '#FDECE6' },
  P3: { swatch: '#1baf7a', color: '#0d8a5e', bg: '#E6F7F0' }, // bajo 3:1 como swatch — siempre con etiqueta
  P4: { swatch: '#eda100', color: '#a06c00', bg: '#FDF3E0' }, // bajo 3:1 como swatch — siempre con etiqueta
  P5: { swatch: '#e87ba4', color: '#c14b78', bg: '#FCEBF1' }, // bajo 3:1 como swatch — siempre con etiqueta
  P6: { swatch: '#008300', color: '#006b00', bg: '#E6F5E6' },
  P7: { swatch: '#e34948', color: '#c62f2e', bg: '#FCEAEA' },
};
