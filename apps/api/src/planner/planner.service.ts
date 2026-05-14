import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  UserLearningPlanItemSource,
  UserLearningPlanStatus,
  UserRole,
} from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SaveLearningPlanDto } from './dto/save-learning-plan.dto';

const planInclude = {
  items: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.UserLearningPlanInclude;

type LearningPlanWithItems = Prisma.UserLearningPlanGetPayload<{
  include: typeof planInclude;
}>;

@Injectable()
export class PlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  private async requireConsumer(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    if (user.role !== UserRole.CONSUMER) {
      throw new ForbiddenException('Consumer role required');
    }
    const profile = user.consumerProfile;
    if (!profile) {
      throw new NotFoundException('Consumer profile missing');
    }
    return { profile };
  }

  private toResponse(plan: LearningPlanWithItems) {
    return {
      id: plan.id,
      childProfileId: plan.childProfileId,
      child: plan.childSnapshot,
      categoryId: plan.categoryId,
      title: plan.title,
      status: plan.status,
      items: plan.items.map((item) => ({
        id: item.id,
        source: item.source,
        scientificTemplateBlockId: item.scientificTemplateBlockId ?? undefined,
        courseId: item.courseId ?? undefined,
        title: item.title,
        notes: item.notes,
        order: item.sortOrder,
        rationale: item.rationale,
        suggestedWeeklyMinutes: item.suggestedWeeklyMinutes ?? undefined,
        milestoneLabels: item.milestoneLabels,
      })),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  async getPlan(
    clerkUserId: string,
    childProfileId: string,
    categoryId: string,
  ) {
    if (!childProfileId || !categoryId) {
      throw new BadRequestException('childProfileId and categoryId are required');
    }
    const { profile } = await this.requireConsumer(clerkUserId);
    const plan = await this.prisma.userLearningPlan.findFirst({
      where: {
        consumerProfileId: profile.id,
        childProfileId,
        categoryId,
      },
      include: planInclude,
    });

    return plan ? this.toResponse(plan) : null;
  }

  async listPlans(clerkUserId: string) {
    const { profile } = await this.requireConsumer(clerkUserId);
    const plans = await this.prisma.userLearningPlan.findMany({
      where: { consumerProfileId: profile.id },
      include: planInclude,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return plans.map((plan) => this.toResponse(plan));
  }

  async savePlan(clerkUserId: string, dto: SaveLearningPlanDto) {
    const { profile } = await this.requireConsumer(clerkUserId);
    const childProfileId = dto.child.id;
    const title =
      dto.title?.trim() ||
      `Roadmap de ${dto.child.displayName.trim()} (${dto.categoryId})`;
    const items = dto.items.map((item, index) => ({
      id: item.id,
      source: item.source as UserLearningPlanItemSource,
      scientificTemplateBlockId: item.scientificTemplateBlockId ?? null,
      courseId: item.courseId ?? null,
      title: item.title.trim(),
      notes: item.notes ?? null,
      sortOrder: item.order ?? index,
      rationale: item.rationale,
      suggestedWeeklyMinutes: item.suggestedWeeklyMinutes ?? null,
      milestoneLabels: item.milestoneLabels ?? [],
    }));

    const plan = await this.prisma.$transaction(async (tx) => {
      const savedPlan = await tx.userLearningPlan.upsert({
        where: {
          consumerProfileId_childProfileId_categoryId: {
            consumerProfileId: profile.id,
            childProfileId,
            categoryId: dto.categoryId,
          },
        },
        create: {
          consumerProfileId: profile.id,
          childProfileId,
          childSnapshot: dto.child as unknown as Prisma.InputJsonValue,
          categoryId: dto.categoryId,
          title,
          status: (dto.status ?? UserLearningPlanStatus.DRAFT) as UserLearningPlanStatus,
        },
        update: {
          childSnapshot: dto.child as unknown as Prisma.InputJsonValue,
          title,
          status: (dto.status ?? UserLearningPlanStatus.DRAFT) as UserLearningPlanStatus,
        },
      });

      await tx.userLearningPlanItem.deleteMany({
        where: { planId: savedPlan.id },
      });

      if (items.length > 0) {
        await tx.userLearningPlanItem.createMany({
          data: items.map((item) => ({
            ...item,
            planId: savedPlan.id,
          })),
        });
      }

      return tx.userLearningPlan.findUniqueOrThrow({
        where: { id: savedPlan.id },
        include: planInclude,
      });
    });

    return this.toResponse(plan);
  }
}
