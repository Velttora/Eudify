import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AppointmentReviewAuthor,
  AppointmentStatus,
  OnboardingStep,
  Prisma,
  ProviderKind,
  ProviderProfile,
  ProviderOfferStatus,
  UserRole,
} from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';
import {
  providerRatingSummaries,
  providerRatingSummary,
  type ProviderRatingSummary,
} from '../ratings/provider-rating-summary';
import { type DiscoverListFilters } from './discover-list-filters';

export type DiscoverProviderRow = {
  id: string;
  fullName: string | null;
  bio: string | null;
  photoUrl: string | null;
  averageRating: number;
  ratingCount: number;
  isVerified: boolean;
  availabilitySummary: string | null;
  kinds: ProviderKind[];
  city: string | null;
  yearsOfExperience: number | null;
  focusAreas: string[];
  serviceMode: string | null;
};

export type DiscoverPublicPublishedOffer = {
  id: string;
  type: string;
  title: string;
  category: string;
  description: string;
  ageBands: string[];
  modality: string;
  durationMinutes: number;
  priceMinor: number;
  currency: string;
  suggestedFrequency: string;
  maxSeats: number | null;
};

export type DiscoverPublicConsumerReview = {
  stars: number;
  comment: string | null;
  createdAt: string;
};

/** Ficha pública ampliada (ofertas + reseñas de familias en citas completadas). */
export type DiscoverPublicProfile = DiscoverProviderRow & {
  publishedOffers: DiscoverPublicPublishedOffer[];
  consumerReviews: DiscoverPublicConsumerReview[];
};

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailable(filters?: DiscoverListFilters): Promise<DiscoverProviderRow[]> {
    const where: Prisma.ProviderProfileWhereInput = {
      isAvailable: true,
      isProfileCompleted: true,
      user: {
        role: UserRole.PROVIDER,
        onboardingStep: OnboardingStep.COMPLETED,
      },
    };

    if (filters?.kind) {
      where.kinds = { has: filters.kind };
    }
    if (filters?.serviceMode) {
      where.serviceMode = filters.serviceMode;
    }
    if (filters?.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters?.minYearsExperience != null) {
      where.yearsOfExperience = { gte: filters.minYearsExperience };
    }
    if (filters?.focusTags?.length) {
      where.focusAreas = { hasSome: filters.focusTags };
    }
    if (filters?.search) {
      const s = filters.search;
      where.AND = [
        {
          OR: [
            { fullName: { contains: s, mode: 'insensitive' } },
            { bio: { contains: s, mode: 'insensitive' } },
            { city: { contains: s, mode: 'insensitive' } },
            { availabilitySummary: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const rows = await this.prisma.providerProfile.findMany({
      where,
      orderBy: [{ fullName: 'asc' }],
    });

    const summaries = await providerRatingSummaries(
      this.prisma,
      rows.map((p) => p.id),
    );

    return rows
      .map((p) => this.toRow(p, summaries.get(p.id)))
      .filter((p) =>
        filters?.minRating != null
          ? p.averageRating >= Math.min(5, filters.minRating)
          : true,
      )
      .filter((p) =>
        filters?.minReviewCount != null
          ? p.ratingCount >= filters.minReviewCount
          : true,
      )
      .sort(
        (a, b) =>
          b.averageRating - a.averageRating ||
          b.ratingCount - a.ratingCount ||
          (a.fullName ?? '').localeCompare(b.fullName ?? ''),
      )
      .slice(0, 48);
  }

  /** Ficha pública ampliada (ofertas publicadas + comentarios de familias en citas completadas). */
  async getPublicProfile(providerProfileId: string): Promise<DiscoverPublicProfile> {
    const p = await this.prisma.providerProfile.findFirst({
      where: {
        id: providerProfileId,
        isAvailable: true,
        isProfileCompleted: true,
        user: {
          role: UserRole.PROVIDER,
          onboardingStep: OnboardingStep.COMPLETED,
        },
      },
    });
    if (!p) {
      throw new NotFoundException('Provider not found');
    }

    const [publishedOffers, reviewRows, rating] = await Promise.all([
      this.prisma.providerOffer.findMany({
        where: {
          providerProfileId: p.id,
          status: ProviderOfferStatus.PUBLISHED,
        },
        orderBy: { title: 'asc' },
        select: {
          id: true,
          type: true,
          title: true,
          category: true,
          description: true,
          ageBands: true,
          modality: true,
          durationMinutes: true,
          priceMinor: true,
          currency: true,
          suggestedFrequency: true,
          maxSeats: true,
        },
      }),
      this.prisma.appointmentReview.findMany({
        where: {
          authorRole: AppointmentReviewAuthor.CONSUMER,
          appointment: {
            providerProfileId: p.id,
            status: AppointmentStatus.COMPLETED,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          stars: true,
          comment: true,
          createdAt: true,
        },
      }),
      providerRatingSummary(this.prisma, p.id),
    ]);

    return {
      ...this.toRow(p, rating),
      publishedOffers,
      consumerReviews: reviewRows.map((r) => ({
        stars: r.stars,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  private toRow(
    p: ProviderProfile,
    rating: ProviderRatingSummary = { averageRating: 0, ratingCount: 0 },
  ): DiscoverProviderRow {
    const verification = p as ProviderProfile & { isVerified?: boolean };
    return {
      id: p.id,
      fullName: p.fullName,
      bio: p.bio,
      photoUrl: p.photoUrl,
      averageRating: rating.averageRating,
      ratingCount: rating.ratingCount,
      isVerified: verification.isVerified === true,
      availabilitySummary: p.availabilitySummary,
      kinds: p.kinds,
      city: p.city,
      yearsOfExperience: p.yearsOfExperience,
      focusAreas: p.focusAreas,
      serviceMode: p.serviceMode,
    };
  }
}
