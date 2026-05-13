import { apiRequest } from '@/shared/lib/api';
import type { ProviderKind, ServiceMode } from '@/shared/types/bootstrap';

export type ProviderProfileResponse = {
  id: string;
  userId: string;
  fullName: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  focusAreas: string[];
  serviceMode: ServiceMode | null;
  city: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  unitOrBuilding: string | null;
  dwellingType: 'HOUSE' | 'APARTMENT' | null;
  isProfileCompleted: boolean;
  photoUrl: string | null;
  averageRating: number;
  ratingCount: number;
  isVerified: boolean;
  isAvailable: boolean;
  availabilitySummary: string | null;
  kinds: ProviderKind[];
};

export function getProviderProfile(getToken: () => Promise<string | null>) {
  return apiRequest<ProviderProfileResponse>('/provider-profiles/me', {
    getToken,
  });
}

export function patchProviderProfile(
  getToken: () => Promise<string | null>,
  body: Partial<{
    fullName: string;
    bio: string;
    yearsOfExperience: number;
    focusAreas: string[];
    serviceMode: ServiceMode;
    city: string;
    streetAddress: string;
    postalCode: string;
    unitOrBuilding: string;
    dwellingType: 'HOUSE' | 'APARTMENT';
    photoUrl: string;
    availabilitySummary: string;
    kinds: ProviderKind[];
    isAvailable: boolean;
  }>,
) {
  return apiRequest<ProviderProfileResponse>('/provider-profiles/me', {
    method: 'PATCH',
    body,
    getToken,
  });
}

export function completeProviderOnboarding(
  getToken: () => Promise<string | null>,
) {
  return apiRequest<ProviderProfileResponse>(
    '/provider-profiles/me/complete',
    {
      method: 'POST',
      getToken,
    },
  );
}
