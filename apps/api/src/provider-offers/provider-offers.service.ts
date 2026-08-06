import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  ProviderOfferStatus,
  Prisma,
  UserRole,
} from '@repo/database';
import { PLATFORM_DEFAULT_CURRENCY } from '@repo/currency';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  CreateProviderOfferDto,
  PatchProviderOfferDto,
} from './dto/create-provider-offer.dto';

function assertPublishable(data: {
  title: string;
  description: string;
  durationMinutes: number;
  priceMinor: number;
}) {
  if (data.title.trim().length < 2) {
    throw new BadRequestException(
      'El título debe tener al menos 2 caracteres para publicar.',
    );
  }
  if (data.description.trim().length < 20) {
    throw new BadRequestException(
      'La descripción debe tener al menos 20 caracteres para publicar.',
    );
  }
  if (data.durationMinutes < 15) {
    throw new BadRequestException('Duración mínima: 15 minutos.');
  }
  if (data.priceMinor <= 0) {
    throw new BadRequestException('Indica un precio mayor que cero para publicar.');
  }
}

@Injectable()
export class ProviderOffersService {
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
    return { profile };
  }

  private async bookingCountsByOffer(
    providerProfileId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.appointment.groupBy({
      by: ['providerOfferId'],
      where: {
        providerProfileId,
        providerOfferId: { not: null },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
        },
      },
      _count: { _all: true },
    });
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.providerOfferId) m.set(r.providerOfferId, r._count._all);
    }
    return m;
  }

  async listMine(clerkUserId: string) {
    const { profile } = await this.requireProvider(clerkUserId);
    const [offers, counts] = await Promise.all([
      this.prisma.providerOffer.findMany({
        where: { providerProfileId: profile.id },
        orderBy: { updatedAt: 'desc' },
      }),
      this.bookingCountsByOffer(profile.id),
    ]);
    return offers.map((o) => ({
      ...o,
      bookingsCount: counts.get(o.id) ?? 0,
      viewsCount: 0,
    }));
  }

  async createMine(clerkUserId: string, dto: CreateProviderOfferDto) {
    const { profile } = await this.requireProvider(clerkUserId);
    // Stripe Connect se exige al cobrar (cuando se confirma una cita), no al armar el catálogo.
    const ageBands = CreateProviderOfferDto.normalizeAgeBands(dto.ageBands);
    const currency = (dto.currency ?? PLATFORM_DEFAULT_CURRENCY).toUpperCase();
    const maxSeats =
      dto.maxSeats === undefined || dto.maxSeats === null ? null : dto.maxSeats;

    if (dto.status === ProviderOfferStatus.PUBLISHED) {
      assertPublishable({
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        priceMinor: dto.priceMinor,
      });
    }

    return this.prisma.providerOffer.create({
      data: {
        providerProfileId: profile.id,
        type: dto.type,
        title: dto.title.trim(),
        category: (dto.category ?? '').trim(),
        description: dto.description.trim(),
        ageBands,
        modality: dto.modality,
        durationMinutes: dto.durationMinutes,
        priceMinor: dto.priceMinor,
        currency,
        objectives: dto.objectives ?? [],
        methodologyNote: (dto.methodologyNote ?? '').trim(),
        suggestedFrequency: dto.suggestedFrequency.trim(),
        maxSeats,
        status: dto.status,
      },
    });
  }

  async updateMine(
    clerkUserId: string,
    offerId: string,
    dto: PatchProviderOfferDto,
  ) {
    const { profile } = await this.requireProvider(clerkUserId);
    const existing = await this.prisma.providerOffer.findFirst({
      where: { id: offerId, providerProfileId: profile.id },
    });
    if (!existing) {
      throw new NotFoundException('Oferta no encontrada');
    }

    const next: Prisma.ProviderOfferUpdateInput = {};
    if (dto.type !== undefined) next.type = dto.type;
    if (dto.title !== undefined) next.title = dto.title.trim();
    if (dto.category !== undefined) next.category = dto.category.trim();
    if (dto.description !== undefined) next.description = dto.description.trim();
    if (dto.ageBands !== undefined) {
      next.ageBands = CreateProviderOfferDto.normalizeAgeBands(dto.ageBands);
    }
    if (dto.modality !== undefined) next.modality = dto.modality;
    if (dto.durationMinutes !== undefined) next.durationMinutes = dto.durationMinutes;
    if (dto.priceMinor !== undefined) next.priceMinor = dto.priceMinor;
    if (dto.currency !== undefined) next.currency = dto.currency.toUpperCase();
    if (dto.objectives !== undefined) next.objectives = dto.objectives;
    if (dto.methodologyNote !== undefined) {
      next.methodologyNote = dto.methodologyNote.trim();
    }
    if (dto.suggestedFrequency !== undefined) {
      next.suggestedFrequency = dto.suggestedFrequency.trim();
    }
    if (dto.maxSeats !== undefined) {
      next.maxSeats =
        dto.maxSeats === null || dto.maxSeats === undefined ? null : dto.maxSeats;
    }
    if (dto.status !== undefined) next.status = dto.status;

    if (Object.keys(next).length === 0) {
      throw new BadRequestException('Nada que actualizar');
    }

    const mergedTitle = dto.title !== undefined ? dto.title.trim() : existing.title;
    const mergedDescription =
      dto.description !== undefined ? dto.description.trim() : existing.description;
    const mergedDuration =
      dto.durationMinutes !== undefined
        ? dto.durationMinutes
        : existing.durationMinutes;
    const mergedPrice = dto.priceMinor !== undefined ? dto.priceMinor : existing.priceMinor;
    const mergedStatus =
      dto.status !== undefined ? dto.status : existing.status;

    if (mergedStatus === ProviderOfferStatus.PUBLISHED) {
      assertPublishable({
        title: mergedTitle,
        description: mergedDescription,
        durationMinutes: mergedDuration,
        priceMinor: mergedPrice,
      });
    }

    return this.prisma.providerOffer.update({
      where: { id: offerId },
      data: next,
    });
  }
}
