import type { EdifyBlockId } from './types';

export const EDIFY_BLOCK_IDS: EdifyBlockId[] = [
  'BLOQUE_I',
  'BLOQUE_II',
  'BLOQUE_III',
  'BLOQUE_IV',
];

export type EdifyBlockDefinition = {
  id: EdifyBlockId;
  order: number;
  label: string;
  months: string;
  moduleRange: [number, number];
  objetivo: string;
};

/** Fuente: Edify_Framework_Academico_2026.pdf, sección 04 (Arquitectura Anual Completa). */
export const EDIFY_BLOCKS: Record<EdifyBlockId, EdifyBlockDefinition> = {
  BLOQUE_I: {
    id: 'BLOQUE_I',
    order: 1,
    label: 'Semilla del Hogar',
    months: 'Meses 1–2',
    moduleRange: [1, 7],
    objetivo:
      'Instala el lenguaje común del programa. Levanta la línea base de cada pilar en el hogar. Prioriza los hábitos con mayor impacto en el desarrollo: sueño, agua, vínculo, movimiento y luz.',
  },
  BLOQUE_II: {
    id: 'BLOQUE_II',
    order: 2,
    label: 'Cuerpo & Ambiente',
    months: 'Meses 3–5',
    moduleRange: [8, 13],
    objetivo:
      'Sale del hábito individual y entra al diseño del entorno. Trabaja la calidad del aire del hogar, el contacto con naturaleza, la cocina participativa, el manejo de pantallas y la postura.',
  },
  BLOQUE_III: {
    id: 'BLOQUE_III',
    order: 3,
    label: 'Autonomía Saludable',
    months: 'Meses 6–9',
    moduleRange: [14, 20],
    objetivo:
      'Transforma hábitos guiados por adultos en hábitos compartidos y progresivamente autónomos. Introduce pensamiento crítico sobre alimentación, tecnología y entorno.',
  },
  BLOQUE_IV: {
    id: 'BLOQUE_IV',
    order: 4,
    label: 'Comunidad & Cultura',
    months: 'Meses 10–12',
    moduleRange: [21, 26],
    objetivo:
      'Convierte los hábitos en cultura familiar compartida. Integra la comunidad, las salidas, la cocina con memoria cultural, el círculo de palabra y el cierre consciente del año.',
  },
};

export function blockForModuleNumber(moduleNumber: number): EdifyBlockDefinition {
  const found = EDIFY_BLOCK_IDS.map((id) => EDIFY_BLOCKS[id]).find(
    (b) => moduleNumber >= b.moduleRange[0] && moduleNumber <= b.moduleRange[1],
  );
  if (!found) {
    throw new Error(`No hay bloque definido para el módulo ${moduleNumber}`);
  }
  return found;
}
