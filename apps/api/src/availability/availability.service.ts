import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { UpdateAvailabilityBlockDto } from './dto/update-availability-block.dto';

@Injectable()
export class AvailabilityService {
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

  private parseRange(dto: { startsAt: string; endsAt: string }) {
    const start = new Date(dto.startsAt);
    const end = new Date(dto.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (end <= start) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    return { start, end };
  }

  async listMine(clerkUserId: string) {
    const { profile } = await this.requireProvider(clerkUserId);
    return this.prisma.providerAvailabilityBlock.findMany({
      where: { providerProfileId: profile.id },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createMine(clerkUserId: string, dto: CreateAvailabilityBlockDto) {
    const { profile } = await this.requireProvider(clerkUserId);
    const { start, end } = this.parseRange(dto);
    return this.prisma.providerAvailabilityBlock.create({
      data: {
        providerProfileId: profile.id,
        startsAt: start,
        endsAt: end,
        isAllDay: dto.isAllDay ?? false,
        timezone: dto.timezone?.trim() || 'UTC',
      },
    });
  }

  async updateMine(
    clerkUserId: string,
    blockId: string,
    dto: UpdateAvailabilityBlockDto,
  ) {
    const { profile } = await this.requireProvider(clerkUserId);
    const existing = await this.prisma.providerAvailabilityBlock.findFirst({
      where: { id: blockId, providerProfileId: profile.id },
    });
    if (!existing) {
      throw new NotFoundException('Availability block not found');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.prisma.providerAvailabilityBlock.update({
      where: { id: blockId },
      data: {
        startsAt,
        endsAt,
        isAllDay: dto.isAllDay ?? undefined,
        timezone: dto.timezone !== undefined ? dto.timezone.trim() || 'UTC' : undefined,
      },
    });
  }

  async deleteMine(clerkUserId: string, blockId: string) {
    const { profile } = await this.requireProvider(clerkUserId);
    const existing = await this.prisma.providerAvailabilityBlock.findFirst({
      where: { id: blockId, providerProfileId: profile.id },
    });
    if (!existing) {
      throw new NotFoundException('Availability block not found');
    }
    await this.prisma.providerAvailabilityBlock.delete({ where: { id: blockId } });
    return { deleted: true };
  }

  /** Bloques futuros de un educador (cualquier usuario autenticado). */
  async listForProviderProfile(providerProfileId: string, clerkUserId: string) {
    await this.users.findByClerkOrThrow(clerkUserId);

    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const now = new Date();
    return this.prisma.providerAvailabilityBlock.findMany({
      where: {
        providerProfileId,
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}
