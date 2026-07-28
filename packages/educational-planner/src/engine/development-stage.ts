import { AGE_STAGES } from '../domain/age-stages';
import type { AgeStageDefinition } from '../domain/types';

/**
 * Edad en años (decimal) respecto a `referenceDate`.
 */
export function ageInYearsFromBirth(
  birthDate: string | Date,
  referenceDate: Date = new Date(),
): number {
  const birth =
    typeof birthDate === 'string' ? new Date(birthDate) : new Date(birthDate);
  const ms = referenceDate.getTime() - birth.getTime();
  if (ms < 0) return 0;
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

/**
 * Resuelve la etapa de desarrollo activa según edad cronológica.
 * Cortes: menor de 4 → 0–3, menor de 8 → 4–7, menor de 13 → 8–12, si no → 13–18.
 */
export function getDevelopmentStageByAge(
  birthDate: string | Date,
  referenceDate: Date = new Date(),
): AgeStageDefinition {
  const y = ageInYearsFromBirth(birthDate, referenceDate);
  if (y < 4) return AGE_STAGES.STAGE_0_3;
  if (y < 8) return AGE_STAGES.STAGE_4_7;
  if (y < 13) return AGE_STAGES.STAGE_8_12;
  return AGE_STAGES.STAGE_13_18;
}
