/**
 * @repo/educational-planner
 *
 * Dominio + motor por reglas del Educational Planner.
 * Sin dependencias de React: apto para Nest (importación de funciones puras),
 * app web y futura app móvil.
 *
 * Persistencia: `UserLearningPlan` / `UserLearningPlanItem` mapean a tablas Prisma
 * (`planner_plans`, `planner_plan_items`) a través del API de la app.
 */

export * from './domain/types';
export * from './domain/age-stages';
export * from './domain/categories';

export * from './data/courses.mock';
export * from './data/scientific-templates.mock';
export * from './data/development-insights.mock';
export * from './data/recommendation-rules.mock';

export * from './engine/ids';
export * from './engine/development-stage';
export * from './engine/recommendation';
