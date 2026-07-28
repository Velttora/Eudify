/**
 * @repo/educational-planner
 *
 * Dominio del Plan Anual Edify: 26 módulos quincenales sobre los 7 Pilares del
 * Desarrollo Integral, organizados en 4 bloques. Contenido fijo (no generado por
 * IA); fuente única Edify_Framework_Academico_2026.pdf. Sin dependencias de
 * React: apto para Nest (importación de funciones puras), app web y futura app
 * móvil.
 *
 * Persistencia del progreso de cada niño: `ChildCurriculumProgress` /
 * `ChildModuleCompletion` en Prisma, vía el API de la app.
 */

export * from './domain/types';
export * from './domain/age-stages';
export * from './domain/pilares';
export * from './domain/blocks';

export * from './data/curriculum-modules';

export * from './engine/development-stage';
