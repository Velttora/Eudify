import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsumerPlan, UserRole } from '@repo/database';
import { TOTAL_CURRICULUM_MODULES } from '@repo/educational-planner';

import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';

/** "Módulo 1 completo" es el beneficio de SEMILLA (gratis) en la tabla de precios. */
const FREE_PLAN_MODULE_LIMIT = 1;

@Injectable()
export class PlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly subscriptions: SubscriptionsService,
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

  private async requireOwnChild(consumerProfileId: string, childProfileId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id: childProfileId, consumerProfileId },
      select: { id: true },
    });
    if (!child) {
      throw new NotFoundException('childProfileId debe ser uno de tus hijos registrados');
    }
  }

  async getProgress(clerkUserId: string, childProfileId: string) {
    const { profile } = await this.requireConsumer(clerkUserId);
    await this.requireOwnChild(profile.id, childProfileId);
    const progress = await this.prisma.childCurriculumProgress.findUnique({
      where: {
        consumerProfileId_childProfileId: {
          consumerProfileId: profile.id,
          childProfileId,
        },
      },
      include: { completions: { orderBy: { moduleNumber: 'asc' } } },
    });
    if (!progress) {
      return { childProfileId, currentModuleNumber: 1, completedModuleNumbers: [] as number[] };
    }
    return {
      childProfileId,
      currentModuleNumber: progress.currentModuleNumber,
      completedModuleNumbers: progress.completions.map((c) => c.moduleNumber),
    };
  }

  async completeModule(clerkUserId: string, childProfileId: string, moduleNumber: number) {
    if (moduleNumber < 1 || moduleNumber > TOTAL_CURRICULUM_MODULES) {
      throw new BadRequestException(
        `moduleNumber debe estar entre 1 y ${TOTAL_CURRICULUM_MODULES}`,
      );
    }
    const { profile } = await this.requireConsumer(clerkUserId);
    await this.requireOwnChild(profile.id, childProfileId);

    const existing = await this.prisma.childCurriculumProgress.findUnique({
      where: {
        consumerProfileId_childProfileId: {
          consumerProfileId: profile.id,
          childProfileId,
        },
      },
    });
    const currentModuleNumber = existing?.currentModuleNumber ?? 1;
    if (moduleNumber !== currentModuleNumber) {
      throw new BadRequestException(
        `Solo puedes completar el módulo actual (${currentModuleNumber}); los módulos del Plan Anual se recorren en orden.`,
      );
    }

    if (moduleNumber > FREE_PLAN_MODULE_LIMIT) {
      const plan = await this.subscriptions.getPlanForConsumerProfile(profile.id);
      if (!this.subscriptions.hasPlanAccess(plan, ConsumerPlan.FAMILIA)) {
        throw new HttpException(
          `El plan Semilla incluye el Módulo ${FREE_PLAN_MODULE_LIMIT} del Plan Anual. Actualiza a Familia para desbloquear los ${TOTAL_CURRICULUM_MODULES} módulos.`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    const nextModuleNumber = Math.min(moduleNumber + 1, TOTAL_CURRICULUM_MODULES);

    const progress = await this.prisma.childCurriculumProgress.upsert({
      where: {
        consumerProfileId_childProfileId: {
          consumerProfileId: profile.id,
          childProfileId,
        },
      },
      create: {
        consumerProfileId: profile.id,
        childProfileId,
        currentModuleNumber: nextModuleNumber,
      },
      update: { currentModuleNumber: nextModuleNumber },
    });

    await this.prisma.childModuleCompletion.upsert({
      where: {
        progressId_moduleNumber: { progressId: progress.id, moduleNumber },
      },
      create: { progressId: progress.id, moduleNumber },
      update: {},
    });

    const completions = await this.prisma.childModuleCompletion.findMany({
      where: { progressId: progress.id },
      select: { moduleNumber: true },
      orderBy: { moduleNumber: 'asc' },
    });

    return {
      childProfileId,
      currentModuleNumber: progress.currentModuleNumber,
      completedModuleNumbers: completions.map((c) => c.moduleNumber),
    };
  }
}
