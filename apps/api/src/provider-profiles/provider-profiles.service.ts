import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnboardingStep, ProviderProfile, UserRole } from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';
import { providerRatingSummary } from '../ratings/provider-rating-summary';
import { UsersService } from '../users/users.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';

@Injectable()
export class ProviderProfilesService {
  private async toResponse(p: ProviderProfile) {
    const rating = await providerRatingSummary(this.prisma, p.id);
    return {
      ...p,
      averageRating: rating.averageRating,
      ratingCount: rating.ratingCount,
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  private async requireProvider(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    if (user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Provider role required');
    }
    const profile = user.providerProfile;
    if (!profile) {
      throw new NotFoundException('Provider profile missing');
    }
    return { user, profile };
  }

  async getMe(clerkUserId: string) {
    const { profile } = await this.requireProvider(clerkUserId);
    const row = await this.prisma.providerProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    return this.toResponse(row);
  }

  async updateMe(clerkUserId: string, dto: UpdateProviderProfileDto) {
    const { profile } = await this.requireProvider(clerkUserId);
    const row = await this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        fullName: dto.fullName ?? undefined,
        bio: dto.bio ?? undefined,
        yearsOfExperience: dto.yearsOfExperience ?? undefined,
        focusAreas: dto.focusAreas ?? undefined,
        serviceMode: dto.serviceMode ?? undefined,
        city: dto.city ?? undefined,
        streetAddress: dto.streetAddress ?? undefined,
        postalCode: dto.postalCode ?? undefined,
        unitOrBuilding: dto.unitOrBuilding ?? undefined,
        dwellingType: dto.dwellingType ?? undefined,
        photoUrl: dto.photoUrl ?? undefined,
        availabilitySummary: dto.availabilitySummary ?? undefined,
        kinds: dto.kinds ?? undefined,
        isAvailable: dto.isAvailable ?? undefined,
      },
    });
    return this.toResponse(row);
  }

  async completeOnboarding(clerkUserId: string) {
    const { user, profile } = await this.requireProvider(clerkUserId);
    if (user.onboardingStep === OnboardingStep.COMPLETED) {
      return this.getMe(clerkUserId);
    }

    const current = await this.prisma.providerProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });

    if (!current.fullName?.trim()) {
      throw new BadRequestException('fullName is required to complete onboarding');
    }
    if (!current.bio?.trim()) {
      throw new BadRequestException('bio is required to complete onboarding');
    }
    if (current.yearsOfExperience === null || current.yearsOfExperience === undefined) {
      throw new BadRequestException(
        'yearsOfExperience is required to complete onboarding',
      );
    }
    if (!current.focusAreas?.length) {
      throw new BadRequestException(
        'At least one focus area is required to complete onboarding',
      );
    }
    if (!current.serviceMode) {
      throw new BadRequestException('serviceMode is required to complete onboarding');
    }
    if (!current.city?.trim()) {
      throw new BadRequestException('city is required to complete onboarding');
    }
    if (!current.streetAddress?.trim()) {
      throw new BadRequestException('streetAddress is required to complete onboarding');
    }
    if (!current.postalCode?.trim()) {
      throw new BadRequestException('postalCode is required to complete onboarding');
    }
    if (!current.unitOrBuilding?.trim()) {
      throw new BadRequestException('unitOrBuilding is required to complete onboarding');
    }
    if (!current.dwellingType) {
      throw new BadRequestException('dwellingType is required to complete onboarding');
    }

    await this.prisma.$transaction([
      this.prisma.providerProfile.update({
        where: { id: profile.id },
        data: {
          isProfileCompleted: true,
          onboardingCompletedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { onboardingStep: OnboardingStep.COMPLETED },
      }),
    ]);

    return this.getMe(clerkUserId);
  }
}

