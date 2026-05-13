import { z } from 'zod';

const serviceModeSchema = z.enum(['IN_PERSON', 'ONLINE', 'HYBRID']);
const dwellingTypeSchema = z.enum(['HOUSE', 'APARTMENT']);
const providerKindSchema = z.enum(['TEACHER', 'BABYSITTER']);

function isAtLeastSixMonthsOld(value: string) {
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - 6);
  return birthDate <= threshold;
}

const requiredText = (message: string, max: number, min = 1) =>
  z.string().trim().min(min, message).max(max, `Máximo ${max} caracteres.`);

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`);

const yearsSchema = z
  .unknown()
  .refine((value) => value !== '', 'Indica años de experiencia.')
  .refine((value) => Number.isInteger(Number(value)), 'Usa un número entero.')
  .refine((value) => Number(value) >= 0, 'Debe ser 0 o mayor.')
  .refine((value) => Number(value) <= 80, 'Debe ser 80 o menor.');

const focusSchema = z
  .string()
  .trim()
  .min(1, 'Agrega al menos una especialidad.')
  .refine(
    (value) =>
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean).length <= 20,
    'Máximo 20 especialidades.',
  );

export const providerOnboardingFieldSchemas = {
  fullName: requiredText('Indica tu nombre público.', 120, 2),
  bio: requiredText('Escribe una bio breve.', 2000),
  years: yearsSchema,
  focus: focusSchema,
  serviceMode: serviceModeSchema,
  city: requiredText('Indica tu ciudad.', 120),
  streetAddress: requiredText('Completa dirección.', 240, 3),
  postalCode: requiredText('Completa código postal.', 20, 2),
  unitOrBuilding: requiredText('Completa unidad o edificio.', 120),
  dwellingType: dwellingTypeSchema,
  photoUrl: optionalText(600000),
  availabilitySummary: optionalText(800),
  kinds: z
    .array(providerKindSchema)
    .min(1, 'Marca educación, cuidado infantil o ambos.')
    .max(2, 'Máximo dos tipos.'),
} as const;

export const providerProfessionalStepSchema = z.object({
  fullName: providerOnboardingFieldSchemas.fullName,
  bio: providerOnboardingFieldSchemas.bio,
  years: providerOnboardingFieldSchemas.years,
  focus: providerOnboardingFieldSchemas.focus,
  serviceMode: providerOnboardingFieldSchemas.serviceMode,
  city: providerOnboardingFieldSchemas.city,
  kinds: providerOnboardingFieldSchemas.kinds,
});

export const providerLocationStepSchema = z.object({
  streetAddress: providerOnboardingFieldSchemas.streetAddress,
  postalCode: providerOnboardingFieldSchemas.postalCode,
  unitOrBuilding: providerOnboardingFieldSchemas.unitOrBuilding,
  dwellingType: providerOnboardingFieldSchemas.dwellingType,
});

export const providerOnboardingSchema = providerProfessionalStepSchema
  .merge(providerLocationStepSchema)
  .extend({
    photoUrl: providerOnboardingFieldSchemas.photoUrl,
    availabilitySummary: providerOnboardingFieldSchemas.availabilitySummary,
  });

export const consumerOnboardingFieldSchemas = {
  fullName: requiredText('Indica tu nombre completo.', 120, 2),
  phone: optionalText(40),
  city: requiredText('Indica tu ciudad.', 120),
  relationship: requiredText('Indica tu relación con el niño/a.', 120),
  streetAddress: requiredText('Completa dirección.', 240, 3),
  postalCode: requiredText('Completa código postal.', 20, 2),
  unitOrBuilding: requiredText('Completa unidad o edificio.', 120),
  dwellingType: dwellingTypeSchema,
  photoUrl: optionalText(600000),
} as const;

export const childFieldSchemas = {
  firstName: requiredText('Indica el nombre.', 80),
  birthDate: z
    .string()
    .trim()
    .min(1, 'Indica fecha de nacimiento.')
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
      message: 'Fecha de nacimiento inválida.',
    })
    .refine(isAtLeastSixMonthsOld, {
      message: 'El niño debe tener al menos 6 meses.',
    }),
  interests: optionalText(500),
  notes: optionalText(2000),
} as const;

export const consumerProfileStepSchema = z.object({
  fullName: consumerOnboardingFieldSchemas.fullName,
  phone: consumerOnboardingFieldSchemas.phone,
  city: consumerOnboardingFieldSchemas.city,
  relationship: consumerOnboardingFieldSchemas.relationship,
  streetAddress: consumerOnboardingFieldSchemas.streetAddress,
  postalCode: consumerOnboardingFieldSchemas.postalCode,
  unitOrBuilding: consumerOnboardingFieldSchemas.unitOrBuilding,
  dwellingType: consumerOnboardingFieldSchemas.dwellingType,
  photoUrl: consumerOnboardingFieldSchemas.photoUrl,
});

export const childOnboardingSchema = z.object(childFieldSchemas);

export function firstValidationError(result: z.ZodSafeParseResult<unknown>) {
  return result.success ? null : result.error.issues[0]?.message ?? 'Dato inválido.';
}

export function fieldErrorsFromIssues<T extends string>(
  issues: z.ZodIssue[],
): Partial<Record<T, string>> {
  const errors: Partial<Record<T, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (errors[field as T]) continue;
    errors[field as T] = issue.message;
  }
  return errors;
}
