import type { ProviderPublishedOfferRow } from '@/features/providers/api/providers-api';
import { publicApiRequest } from '@/shared/lib/api';
import type { ProviderKind, ServiceMode } from '@/shared/types/bootstrap';

export type PublicPublishedOffer = ProviderPublishedOfferRow;

export type PublicConsumerReview = {
  stars: number;
  comment: string | null;
  createdAt: string;
};

/** Respuesta de `GET /discover/providers/:id` (pública). */
export type PublicEducatorProfile = {
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
  publishedOffers?: PublicPublishedOffer[];
  consumerReviews?: PublicConsumerReview[];
};

export function getPublicEducatorProfile(providerProfileId: string) {
  return publicApiRequest<PublicEducatorProfile>(
    `/discover/providers/${providerProfileId}`,
  );
}
