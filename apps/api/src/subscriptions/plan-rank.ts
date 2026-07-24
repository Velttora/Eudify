import { ConsumerPlan } from '@repo/database';

/** Orden de los planes de familia; cada nivel incluye los beneficios de los anteriores. */
export const PLAN_RANK: Record<ConsumerPlan, number> = {
  [ConsumerPlan.SEMILLA]: 0,
  [ConsumerPlan.FAMILIA]: 1,
  [ConsumerPlan.FAMILIA_PLUS]: 2,
};

export function planMeetsMinimum(plan: ConsumerPlan, minimum: ConsumerPlan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minimum];
}
