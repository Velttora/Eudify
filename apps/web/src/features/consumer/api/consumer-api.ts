import { apiRequest } from '@/shared/lib/api';

export type ConsumerProfileResponse = {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  unitOrBuilding: string | null;
  dwellingType: 'HOUSE' | 'APARTMENT' | null;
  relationshipToChild: string | null;
  photoUrl: string | null;
  isProfileCompleted: boolean;
  children: {
    id: string;
    firstName: string;
    birthDate: string;
    interests: string | null;
    notes: string | null;
  }[];
};

export type CreateChildBody = {
  firstName: string;
  birthDate: string;
  interests?: string;
  notes?: string;
  pillarScores?: Record<string, number>;
};

export function getConsumerProfile(getToken: () => Promise<string | null>) {
  return apiRequest<ConsumerProfileResponse>('/consumer-profiles/me', {
    getToken,
  });
}

export function patchConsumerProfile(
  getToken: () => Promise<string | null>,
  body: Partial<{
    fullName: string;
    phone: string;
    city: string;
    streetAddress: string;
    postalCode: string;
    unitOrBuilding: string;
    dwellingType: 'HOUSE' | 'APARTMENT';
    relationshipToChild: string;
    photoUrl?: string;
  }>,
) {
  return apiRequest<ConsumerProfileResponse>('/consumer-profiles/me', {
    method: 'PATCH',
    body,
    getToken,
  });
}

export function postChild(
  getToken: () => Promise<string | null>,
  body: CreateChildBody,
) {
  return apiRequest<{ id: string }>('/consumer-profiles/me/children', {
    method: 'POST',
    body,
    getToken,
  });
}

export function patchChild(
  getToken: () => Promise<string | null>,
  childId: string,
  body: Partial<CreateChildBody>,
) {
  return apiRequest(`/consumer-profiles/me/children/${childId}`, {
    method: 'PATCH',
    body,
    getToken,
  });
}

export function deleteChild(
  getToken: () => Promise<string | null>,
  childId: string,
) {
  return apiRequest(`/consumer-profiles/me/children/${childId}`, {
    method: 'DELETE',
    getToken,
  });
}

export function completeConsumerOnboarding(
  getToken: () => Promise<string | null>,
) {
  return apiRequest<ConsumerProfileResponse>('/consumer-profiles/me/complete', {
    method: 'POST',
    getToken,
  });
}
