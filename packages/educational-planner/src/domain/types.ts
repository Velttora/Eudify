/**
 * Contratos del Educational Planner.
 * Pensados para serializar a JSON (API Nest / app web y futura app móvil).
 */

/** Etapas de desarrollo usadas para mostrar contexto de edad (badge de perfil). */
export type AgeStageId = 'STAGE_0_3' | 'STAGE_4_7' | 'STAGE_8_12' | 'STAGE_13_18';

export type AgeStageDefinition = {
  id: AgeStageId;
  label: string;
  minAgeYears: number;
  maxAgeYears: number;
};

/**
 * Perfil del menor para el planner.
 * En producción mapea a Child + campos extendidos en Prisma.
 */
export type PlannerChildProfile = {
  id: string;
  displayName: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  birthDate: string;
  interests: string[];
  /** Objetivos declarados por la familia (texto libre corto). */
  goals: string[];
  /** Minutos por semana dedicables al eje elegido. */
  weeklyMinutesAvailable: number;
  /** Etiquetas opcionales: ej. "prefiere mañanas", "necesita rutina visual". */
  learningPreferenceTags?: string[];
};

/** Los 7 Pilares del Desarrollo Integral Edify (mismo esquema que el diagnóstico de onboarding). */
export type PilarId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

/** 4 bloques temáticos de la Arquitectura Anual (26 módulos, 12 meses). */
export type EdifyBlockId = 'BLOQUE_I' | 'BLOQUE_II' | 'BLOQUE_III' | 'BLOQUE_IV';

/**
 * FULL: módulo con la malla curricular completa del documento fuente (objetivo, actividades,
 * indicadores, resultado, fundamentación). SUMMARY_ONLY: el documento fuente solo da nombre +
 * foco/práctica central; falta expandirlo antes de mostrarlo con el mismo detalle que los FULL.
 */
export type CurriculumModuleContentStatus = 'FULL' | 'SUMMARY_ONLY';

/** Un módulo quincenal del Plan Anual Edify. Fuente: Edify_Framework_Academico_2026.pdf. */
export type CurriculumModule = {
  number: number;
  block: EdifyBlockId;
  title: string;
  subtitle?: string;
  ageRange?: string;
  durationWeeks: number;
  /** Escala 1-5 tal como aparece en el documento (★★■■■ = 2). Solo disponible para módulos FULL. */
  difficulty?: number;
  pilarPrincipal: PilarId[];
  pilaresSecundarios?: PilarId[];
  /** Resumen corto siempre presente (para SUMMARY_ONLY, es el texto literal "Foco & Práctica Central"). */
  focoPractica: string;
  objetivoPedagogico?: string;
  actividadesNino?: string[];
  actividadesFamiliares?: string[];
  indicadoresProgreso?: string[];
  resultadoObservable?: string;
  fundamentacionCientifica?: string[];
  contentStatus: CurriculumModuleContentStatus;
};
