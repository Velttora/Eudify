import type {
  LearningCategoryId,
  PlannerChildProfile,
  UserLearningPlan,
  UserLearningPlanItem,
  UserLearningPlanStatus,
} from '@repo/educational-planner';

import { apiRequest } from '@/shared/lib/api';

export type SaveLearningPlanBody = {
  child: PlannerChildProfile;
  categoryId: LearningCategoryId;
  title?: string;
  status?: UserLearningPlanStatus;
  items: UserLearningPlanItem[];
};

export type LearningPlanResponse = UserLearningPlan & {
  child: PlannerChildProfile;
};

export function getLearningPlan(
  getToken: () => Promise<string | null>,
  childProfileId: string,
  categoryId: LearningCategoryId,
) {
  const params = new URLSearchParams({ childProfileId, categoryId });
  return apiRequest<LearningPlanResponse | null>(`/planner/me/plan?${params}`, {
    getToken,
  });
}

export function listLearningPlans(getToken: () => Promise<string | null>) {
  return apiRequest<LearningPlanResponse[]>('/planner/me/plans', {
    getToken,
  });
}

export function saveLearningPlan(
  getToken: () => Promise<string | null>,
  body: SaveLearningPlanBody,
) {
  return apiRequest<LearningPlanResponse>('/planner/me/plan', {
    method: 'PUT',
    body,
    getToken,
  });
}
