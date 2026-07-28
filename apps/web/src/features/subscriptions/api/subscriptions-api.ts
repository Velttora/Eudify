import { apiRequest } from '@/shared/lib/api';

type GetToken = () => Promise<string | null>;

export type ConsumerPlan = 'SEMILLA' | 'FAMILIA' | 'FAMILIA_PLUS';

export type MyPlan = {
  plan: ConsumerPlan;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function getMyPlan(getToken: GetToken) {
  return apiRequest<MyPlan>('/subscriptions/me', { getToken });
}
