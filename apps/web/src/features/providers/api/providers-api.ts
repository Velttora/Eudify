import { apiRequest } from '@/shared/lib/api';
import type { ProviderKind, ServiceMode } from '@/shared/types/bootstrap';

export type RateUnit = 'HOUR' | 'SESSION' | 'DAY';

export type ProviderRateRow = {
  id: string;
  label: string | null;
  amountMinor: number;
  currency: string;
  unit: RateUnit;
  sortOrder: number;
};

export type ProviderAvailabilityBlockRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  timezone: string;
};

/** Ofertas publicadas visibles al reservar (ficha del educador). */
export type ProviderPublishedOfferRow = {
  id: string;
  type: string;
  title: string;
  category: string;
  description: string;
  ageBands: string[];
  modality: ServiceMode;
  durationMinutes: number;
  priceMinor: number;
  currency: string;
  suggestedFrequency: string;
  maxSeats: number | null;
};

export type ProviderDetailResponse = {
  id: string;
  fullName: string | null;
  bio: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  averageRating: number;
  ratingCount: number;
  availabilitySummary: string | null;
  kinds: ProviderKind[];
  city: string | null;
  yearsOfExperience: number | null;
  focusAreas: string[];
  serviceMode: ServiceMode | null;
  rates: ProviderRateRow[];
  availabilityBlocks: ProviderAvailabilityBlockRow[];
  /** Presente desde API con ofertas; vacío si el educador no ha publicado ninguna. */
  publishedOffers?: ProviderPublishedOfferRow[];
};

export function getProviderDetail(
  getToken: () => Promise<string | null>,
  providerProfileId: string,
) {
  return apiRequest<ProviderDetailResponse>(
    `/providers/${providerProfileId}`,
    { getToken },
  );
}
