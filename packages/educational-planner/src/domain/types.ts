/**
 * Contratos del Educational Planner.
 * Pensados para serializar a JSON (API Nest / app móvil futura).
 */

/** Etapas de desarrollo usadas en reglas y plantillas científicas. */
export type AgeStageId =
  | 'STAGE_0_3'
  | 'STAGE_4_7'
  | 'STAGE_8_12'
  | 'STAGE_13_18';

export type LearningCategoryId =
  | 'LANGUAGES'
  | 'NUTRITION'
  | 'NATURE_CONNECTION'
  | 'WOODWORKING'
  | 'ART_CREATIVITY'
  | 'MOVEMENT_BODY';

export type ContentIntensity = 'LOW' | 'MODERATE' | 'HIGH';

export type StructureLevel =
  | 'OPEN_PLAY'
  | 'LIGHT_STRUCTURE'
  | 'STRUCTURED'
  | 'GOAL_DRIVEN';

export type IdealFormat =
  | 'LIVE_HUMAN'
  | 'AUDIO_VIDEO'
  | 'HANDS_ON'
  | 'READING_WRITING'
  | 'PROJECT_BASED'
  | 'MIXED';

/**
 * Perfil del menor para el motor de recomendación.
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

export type AgeStageDefinition = {
  id: AgeStageId;
  label: string;
  minAgeYears: number;
  maxAgeYears: number;
  /** Enfoque pedagógico resumido. */
  learningFocus: string;
  suggestedContentTypes: string[];
  recommendedIntensity: ContentIntensity;
  idealFormats: IdealFormat[];
  structureLevel: StructureLevel;
  pedagogicalNotes: string;
  neurodevelopmentNotes: string;
};

export type Course = {
  id: string;
  title: string;
  shortDescription: string;
  categoryId: LearningCategoryId;
  /** Edad mínima en años (decimal permitido, ej. 1.5) */
  minAgeYears: number;
  maxAgeYears: number;
  /** Minutos sugeridos por semana si se elige este curso. */
  suggestedWeeklyMinutes: number;
  format: IdealFormat;
  tags: string[];
};

/** Bloque dentro de una plantilla científica versionada. */
export type ScientificTemplateBlock = {
  id: string;
  title: string;
  description: string;
  /** Por qué existe este bloque (visible en UI). */
  rationale: string;
  suggestedWeeklyMinutes: number;
  milestoneHints?: string[];
};

export type ScientificPlanTemplate = {
  id: string;
  categoryId: LearningCategoryId;
  ageStageId: AgeStageId;
  version: number;
  title: string;
  summary: string;
  blocks: ScientificTemplateBlock[];
};

/** Regla declarativa para priorizar cursos (motor por reglas, extensible). */
export type CourseRecommendationRule = {
  id: string;
  categoryId: LearningCategoryId;
  ageStageId: AgeStageId;
  /** Si el objetivo del niño contiene alguna de estas subcadenas (lowercase), aplicar boost. */
  goalKeywordBoost?: string[];
  /** IDs de curso que suben en ranking cuando la regla aplica. */
  boostedCourseIds: string[];
  ruleRationale: string;
};

export type DevelopmentInsight = {
  id: string;
  ageStageId: AgeStageId;
  title: string;
  body: string;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
};

/** Ítem editable del roadmap en cliente / fila Prisma `UserLearningPlanItem`. */
export type RoadmapItemSource = 'scientific_template' | 'course' | 'custom';

export type UserLearningPlanItem = {
  /** UUID v4 generado en cliente o id servidor. */
  id: string;
  source: RoadmapItemSource;
  scientificTemplateBlockId?: string;
  courseId?: string;
  title: string;
  notes: string | null;
  order: number;
  rationale: string;
  suggestedWeeklyMinutes?: number;
  milestoneLabels?: string[];
};

export type UserLearningPlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

/** Plan persistido (local o API). */
export type UserLearningPlan = {
  id: string;
  childProfileId: string;
  categoryId: LearningCategoryId;
  title: string;
  status: UserLearningPlanStatus;
  items: UserLearningPlanItem[];
  createdAt: string;
  updatedAt: string;
};

/** Entrada al motor de sugerencias. */
export type RecommendationInput = {
  child: PlannerChildProfile;
  categoryId: LearningCategoryId;
};

/** Salida del motor: sugerencia antes de aceptar / editar. */
export type PlanSuggestion = {
  ageStage: AgeStageDefinition;
  template: ScientificPlanTemplate;
  suggestedCourses: Course[];
  /** Orden sugerido = orden de bloques del template + cursos al final si se añaden. */
  defaultRoadmapItems: UserLearningPlanItem[];
  weeklyIntensityHint: ContentIntensity;
  masterRationale: string;
  appliedRules: { ruleId: string; description: string }[];
  relatedInsight?: DevelopmentInsight;
};
