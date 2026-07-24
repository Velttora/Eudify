import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsumerPlan } from '@repo/database';

import { REQUIRES_PLAN_KEY } from './requires-plan.decorator';
import { SubscriptionsService } from './subscriptions.service';

/** Junto con @RequiresPlan(...), gatea endpoints por el plan activo de la familia autenticada. */
@Injectable()
export class RequiresPlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minimumPlan = this.reflector.getAllAndOverride<ConsumerPlan | undefined>(
      REQUIRES_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!minimumPlan) return true;

    const req = context.switchToHttp().getRequest<{
      clerkUser?: { clerkUserId: string };
    }>();
    const clerkId = req.clerkUser?.clerkUserId;
    if (!clerkId) {
      throw new ForbiddenException('Autenticación requerida');
    }

    const current = await this.subscriptions.getPlanForClerkUser(clerkId);
    if (!this.subscriptions.hasPlanAccess(current, minimumPlan)) {
      throw new ForbiddenException(
        `Esta función requiere el plan ${minimumPlan} o superior`,
      );
    }
    return true;
  }
}
