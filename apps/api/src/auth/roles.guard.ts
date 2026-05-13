import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from './auth.constants';
import type { AppRole } from './roles.decorator';

/**
 * Explicit role guard for API surfaces that need more than a valid Clerk JWT.
 * ADMIN is currently backed by SUPPORT_ADMIN_CLERK_IDS until admin roles live in DB/Clerk orgs.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const req = context.switchToHttp().getRequest<{
      clerkUser?: { clerkUserId: string };
    }>();
    const clerkId = req.clerkUser?.clerkUserId;

    if (roles.includes('ADMIN') && this.isConfiguredAdmin(clerkId)) {
      return true;
    }

    throw new ForbiddenException('No tienes permisos para esta acción.');
  }

  private isConfiguredAdmin(clerkUserId: string | undefined): boolean {
    if (!clerkUserId) return false;
    const raw = process.env.SUPPORT_ADMIN_CLERK_IDS?.trim();
    const allowed =
      raw?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (allowed.length === 0) {
      throw new ForbiddenException(
        'Admin no configurado (SUPPORT_ADMIN_CLERK_IDS).',
      );
    }
    return allowed.includes(clerkUserId);
  }
}
