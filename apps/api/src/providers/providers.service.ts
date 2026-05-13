import { Injectable, NotFoundException } from '@nestjs/common';
import {
  OnboardingStep,
  ProviderOfferStatus,
  UserRole,
} from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';
import { providerRatingSummary } from '../ratings/provider-rating-summary';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /**
   * Ficha enriquecida para usuarios autenticados: tarifas + bloques futuros
   * (además de los datos públicos del listado discover).
   */
  async getAuthenticatedDetail(
    clerkUserId: string,
    providerProfileId: string,
  ) {
    await this.users.findByClerkOrThrow(clerkUserId);

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
      include: {
        rates: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    if (!p) {
      throw new NotFoundException('Provider not found');
    }

    const now = new Date();
    const blocks = await this.prisma.providerAvailabilityBlock.findMany({
      where: {
        providerProfileId: p.id,
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'asc' },
    });

    const [publishedOffers, rating] = await Promise.all([
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
      providerRatingSummary(this.prisma, p.id),
    ]);

    return {
      id: p.id,
      fullName: p.fullName,
      bio: p.bio,
      photoUrl: p.photoUrl,
      averageRating: rating.averageRating,
      ratingCount: rating.ratingCount,
      availabilitySummary: p.availabilitySummary,
      kinds: p.kinds,
      city: p.city,
      yearsOfExperience: p.yearsOfExperience,
      focusAreas: p.focusAreas,
      serviceMode: p.serviceMode,
      rates: p.rates.map((r) => ({
        id: r.id,
        label: r.label,
        amountMinor: r.amountMinor,
        currency: r.currency,
        unit: r.unit,
        sortOrder: r.sortOrder,
      })),
      availabilityBlocks: blocks.map((b) => ({
        id: b.id,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        isAllDay: b.isAllDay,
        timezone: b.timezone,
      })),
      publishedOffers,
    };
  }
}
