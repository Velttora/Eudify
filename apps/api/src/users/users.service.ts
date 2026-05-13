import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  OnboardingStep,
  Prisma,
  UserRole,
} from '@repo/database';
import { createClerkClient } from '@clerk/backend';

import { PrismaService } from '../prisma/prisma.service';
import { providerRatingSummary } from '../ratings/provider-rating-summary';

@Injectable()
export class UsersService {
  private clerk() {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new InternalServerErrorException('CLERK_SECRET_KEY is not set');
    }
    return createClerkClient({ secretKey });
  }

  private async resolveEmail(clerkUserId: string): Promise<string> {
    const timeoutMs = 8_000;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('clerk_get_user_timeout')), timeoutMs);
    });
    try {
      const user = await Promise.race([
        this.clerk().users.getUser(clerkUserId),
        timeout,
      ]);
      const primaryId = user.primaryEmailAddressId;
      const addr =
        user.emailAddresses?.find((e) => e.id === primaryId) ??
        user.emailAddresses?.[0];
      if (addr?.emailAddress) {
        return addr.emailAddress;
      }
    } catch {
      // Clerk unreachable, timeout, or missing email: placeholder keeps sync fast
    }
    return `${clerkUserId}@users.clerk.placeholder`;
  }

  async syncFromClerk(clerkUserId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { clerkUserId },
    });
    if (existing) {
      // No llamar a Clerk en cada sync: evita cuelgues y hace el bootstrap instantáneo.
      return existing;
    }

    const email = await this.resolveEmail(clerkUserId);
    try {
      return await this.prisma.user.create({
        data: {
          clerkUserId,
          email,
          onboardingStep: OnboardingStep.PENDING_ROLE,
        },
      });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: unknown }).code === 'P2002'
      ) {
        const createdByOther = await this.prisma.user.findUnique({
          where: { clerkUserId },
        });
        if (createdByOther) {
          return createdByOther;
        }
      }
      throw err;
    }
  }

  async findByClerkOrThrow(clerkUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      include: {
        consumerProfile: { include: { children: true } },
        providerProfile: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found. Call POST /users/sync first.');
    }
    return user;
  }

  async setRole(clerkUserId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      include: { consumerProfile: true, providerProfile: true },
    });
    if (!user) {
      throw new NotFoundException('User not found. Call POST /users/sync first.');
    }
    if (user.role !== null) {
      throw new ConflictException('Role is already set and cannot be changed.');
    }
    if (user.onboardingStep !== OnboardingStep.PENDING_ROLE) {
      throw new ConflictException('Invalid onboarding state for role selection.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          role,
          onboardingStep: OnboardingStep.PENDING_PROFILE,
        },
      });

      if (role === UserRole.CONSUMER) {
        await tx.consumerProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        });
      } else {
        await tx.providerProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        });
      }

      return updated;
    });
  }

  async getBootstrap(clerkUserId: string) {
    const user = await this.findByClerkOrThrow(clerkUserId);
    return this.buildBootstrap(user);
  }

  private async buildBootstrap(
    user: Prisma.UserGetPayload<{
      include: {
        consumerProfile: { include: { children: true } };
        providerProfile: true;
      };
    }>,
  ) {
    const providerRating = user.providerProfile
      ? await providerRatingSummary(this.prisma, user.providerProfile.id)
      : null;
    const needsRoleSelection = user.role === null;
    const childCount = user.consumerProfile?.children?.length ?? 0;
    const consumerNeedsOnboarding =
      user.role === UserRole.CONSUMER && childCount < 1;
    const providerNeedsOnboarding =
      user.role === UserRole.PROVIDER &&
      user.onboardingStep !== OnboardingStep.COMPLETED;
    const needsOnboarding =
      user.role !== null &&
      (user.role === UserRole.CONSUMER
        ? consumerNeedsOnboarding
        : user.role === UserRole.PROVIDER
          ? providerNeedsOnboarding
          : user.onboardingStep !== OnboardingStep.COMPLETED);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        onboardingStep: user.onboardingStep,
        clerkUserId: user.clerkUserId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      needsRoleSelection,
      needsOnboarding,
      consumerProfile: user.consumerProfile
        ? {
            id: user.consumerProfile.id,
            fullName: user.consumerProfile.fullName,
            phone: user.consumerProfile.phone,
            city: user.consumerProfile.city,
            relationshipToChild: user.consumerProfile.relationshipToChild,
            photoUrl: user.consumerProfile.photoUrl,
            isProfileCompleted: user.consumerProfile.isProfileCompleted,
            children: user.consumerProfile.children.map((c) => ({
              id: c.id,
              firstName: c.firstName,
              birthDate: c.birthDate,
              interests: c.interests,
              notes: c.notes,
            })),
          }
        : null,
      providerProfile: user.providerProfile
        ? {
            id: user.providerProfile.id,
            fullName: user.providerProfile.fullName,
            bio: user.providerProfile.bio,
            yearsOfExperience: user.providerProfile.yearsOfExperience,
            focusAreas: user.providerProfile.focusAreas,
            serviceMode: user.providerProfile.serviceMode,
            city: user.providerProfile.city,
            isProfileCompleted: user.providerProfile.isProfileCompleted,
            photoUrl: user.providerProfile.photoUrl,
            averageRating: providerRating?.averageRating ?? 0,
            ratingCount: providerRating?.ratingCount ?? 0,
            isAvailable: user.providerProfile.isAvailable,
            availabilitySummary: user.providerProfile.availabilitySummary,
            kinds: user.providerProfile.kinds,
          }
        : null,
    };
  }

  constructor(private readonly prisma: PrismaService) {}
}
