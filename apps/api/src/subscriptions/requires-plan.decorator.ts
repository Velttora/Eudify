import { SetMetadata } from '@nestjs/common';
import { ConsumerPlan } from '@repo/database';

export const REQUIRES_PLAN_KEY = 'requiresPlan';

/** Exige que la familia tenga, como mínimo, este plan activo (los superiores también pasan). */
export const RequiresPlan = (minimumPlan: ConsumerPlan) =>
  SetMetadata(REQUIRES_PLAN_KEY, minimumPlan);
