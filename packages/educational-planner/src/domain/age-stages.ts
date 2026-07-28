import type { AgeStageDefinition, AgeStageId } from './types';

export const AGE_STAGE_ORDER: AgeStageId[] = [
  'STAGE_0_3',
  'STAGE_4_7',
  'STAGE_8_12',
  'STAGE_13_18',
];

export const AGE_STAGES: Record<AgeStageId, AgeStageDefinition> = {
  STAGE_0_3: { id: 'STAGE_0_3', label: '0–3 años', minAgeYears: 0, maxAgeYears: 3 },
  STAGE_4_7: { id: 'STAGE_4_7', label: '4–7 años', minAgeYears: 4, maxAgeYears: 7 },
  STAGE_8_12: { id: 'STAGE_8_12', label: '8–12 años', minAgeYears: 8, maxAgeYears: 12 },
  STAGE_13_18: { id: 'STAGE_13_18', label: '13–18 años', minAgeYears: 13, maxAgeYears: 18 },
};
