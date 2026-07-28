import { apiRequest } from '@/shared/lib/api';

export type PlannerProgress = {
  childProfileId: string;
  currentModuleNumber: number;
  completedModuleNumbers: number[];
};

export function getPlannerProgress(
  getToken: () => Promise<string | null>,
  childProfileId: string,
) {
  const params = new URLSearchParams({ childProfileId });
  return apiRequest<PlannerProgress>(`/planner/me/progress?${params}`, { getToken });
}

export function completeModule(
  getToken: () => Promise<string | null>,
  body: { childProfileId: string; moduleNumber: number },
) {
  return apiRequest<PlannerProgress>('/planner/me/progress/complete', {
    method: 'POST',
    body,
    getToken,
  });
}
