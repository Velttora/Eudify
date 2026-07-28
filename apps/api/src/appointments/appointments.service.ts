import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentAttendance,
  AppointmentReviewAuthor,
  AppointmentStatus,
  ConsumerPlan,
  InPersonVenueHost,
  Prisma,
  ProviderKind,
  ProviderOfferStatus,
  RateUnit,
  ServiceMode,
  UserRole,
} from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { ChatService } from '../chat/chat.service';
import {
  ALTERNATIVE_SCHEDULE_UTC_DAY_SPAN,
  utcMaxInstantForAlternativeRequest,
} from './custom-alternative-limits';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateAppointmentReviewDto } from './dto/create-appointment-review.dto';
import { PatchAppointmentDto } from './dto/patch-appointment.dto';

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function containedInBlock(
  apptStart: Date,
  apptEnd: Date,
  blockStart: Date,
  blockEnd: Date,
): boolean {
  return apptStart >= blockStart && apptEnd <= blockEnd;
}

function isBabysitterOnlyKinds(kinds: ProviderKind[]): boolean {
  return kinds.length > 0 && kinds.every((k) => k === ProviderKind.BABYSITTER);
}

const MIN_APPOINTMENT_MINUTES = 15;
const MAX_APPOINTMENT_MINUTES = 8 * 60;
/** Cupo mensual de reservas del plan SEMILLA (gratis); Familia/Familia+ son ilimitadas. */
const SEMILLA_MONTHLY_BOOKING_QUOTA = 1;
const NON_COUNTING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED_BY_FAMILY,
  AppointmentStatus.CANCELLED_BY_PROVIDER,
  AppointmentStatus.DECLINED,
];

type RateQuoteRow = { unit: RateUnit; amountMinor: number; currency: string };

function appointmentDurationMinutes(startsAt: Date, endsAt: Date): number {
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
}

/** Primera tarifa por unidad (orden `sortOrder` ya aplicado en la query). */
function quoteFromProviderRates(
  rates: RateQuoteRow[],
  durationMinutes: number,
): { priceMinor: number; currency: string } | null {
  const hourRates = rates.filter((r) => r.unit === RateUnit.HOUR);
  if (hourRates.length > 0) {
    const r = hourRates[0]!;
    const raw = (r.amountMinor * durationMinutes) / 60;
    const priceMinor = Math.max(1, Math.round(raw));
    return { priceMinor, currency: r.currency.trim().toUpperCase() || 'COP' };
  }
  const sessionRates = rates.filter((r) => r.unit === RateUnit.SESSION);
  if (sessionRates.length > 0) {
    const r = sessionRates[0]!;
    return {
      priceMinor: Math.max(1, r.amountMinor),
      currency: r.currency.trim().toUpperCase() || 'COP',
    };
  }
  const dayRates = rates.filter((r) => r.unit === RateUnit.DAY);
  if (dayRates.length > 0) {
    const r = dayRates[0]!;
    return {
      priceMinor: Math.max(1, r.amountMinor),
      currency: r.currency.trim().toUpperCase() || 'COP',
    };
  }
  return null;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly payments: PaymentsService,
    private readonly chat: ChatService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  private async assertWithinMonthlyBookingQuota(consumerProfileId: string) {
    const current = await this.subscriptions.getPlanForConsumerProfile(consumerProfileId);
    if (this.subscriptions.hasPlanAccess(current, ConsumerPlan.FAMILIA)) {
      return;
    }
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const countThisMonth = await this.prisma.appointment.count({
      where: {
        consumerProfileId,
        createdAt: { gte: monthStart, lt: monthEnd },
        status: { notIn: NON_COUNTING_STATUSES },
      },
    });
    if (countThisMonth >= SEMILLA_MONTHLY_BOOKING_QUOTA) {
      throw new HttpException(
        `El plan Semilla incluye ${SEMILLA_MONTHLY_BOOKING_QUOTA} reserva por mes. Actualiza a Familia para reservas ilimitadas.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  private async requireConsumer(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    if (user.role !== UserRole.CONSUMER) {
      throw new ForbiddenException('Consumer role required');
    }
    const profile = user.consumerProfile;
    if (!profile) {
      throw new NotFoundException('Consumer profile missing');
    }
    return { user, profile };
  }

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

  private appointmentInclude(): Prisma.AppointmentInclude {
    return {
      providerProfile: {
        select: {
          id: true,
          fullName: true,
          city: true,
          photoUrl: true,
          serviceMode: true,
          kinds: true,
          streetAddress: true,
          postalCode: true,
          unitOrBuilding: true,
          dwellingType: true,
        },
      },
      consumerProfile: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          city: true,
          streetAddress: true,
          postalCode: true,
          unitOrBuilding: true,
          dwellingType: true,
        },
      },
      child: {
        select: { id: true, firstName: true },
      },
      providerOffer: {
        select: { id: true, title: true, type: true },
      },
      reviews: {
        select: {
          authorRole: true,
          stars: true,
          comment: true,
        },
      },
      payment: {
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          failureReason: true,
          processedAt: true,
          updatedAt: true,
        },
      },
    };
  }

  private logisticsUpdateFromDto(
    dto: PatchAppointmentDto,
  ): Prisma.AppointmentUpdateInput {
    const data: Prisma.AppointmentUpdateInput = {};
    if (dto.meetingUrl !== undefined) {
      const t = dto.meetingUrl.trim();
      data.meetingUrl = t.length > 0 ? t : null;
    }
    if (dto.inPersonVenueHost !== undefined) {
      data.inPersonVenueHost = dto.inPersonVenueHost;
    }
    if (dto.attendanceMode !== undefined) {
      data.attendanceMode = dto.attendanceMode;
    }
    return data;
  }

  async listMineConsumer(clerkUserId: string) {
    const { profile } = await this.requireConsumer(clerkUserId);
    return this.prisma.appointment.findMany({
      where: { consumerProfileId: profile.id },
      orderBy: { startsAt: 'desc' },
      include: this.appointmentInclude(),
    });
  }

  async listMineProvider(clerkUserId: string) {
    const { profile } = await this.requireProvider(clerkUserId);
    return this.prisma.appointment.findMany({
      where: { providerProfileId: profile.id },
      orderBy: { startsAt: 'asc' },
      include: this.appointmentInclude(),
    });
  }

  async create(clerkUserId: string, dto: CreateAppointmentDto) {
    const { profile } = await this.requireConsumer(clerkUserId);
    await this.payments.assertConsumerCanBook(clerkUserId);
    await this.assertWithinMonthlyBookingQuota(profile.id);
    if (!profile.isProfileCompleted) {
      throw new ForbiddenException(
        'Complete your family profile before requesting an appointment',
      );
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const now = new Date();
    if (startsAt < now) {
      throw new BadRequestException('La hora de inicio debe ser en el futuro');
    }
    if (endsAt <= now) {
      throw new BadRequestException('Appointment must end in the future');
    }

    const durationMinutes = appointmentDurationMinutes(startsAt, endsAt);
    if (durationMinutes < MIN_APPOINTMENT_MINUTES) {
      throw new BadRequestException(
        `La sesión debe durar al menos ${MIN_APPOINTMENT_MINUTES} minutos`,
      );
    }
    if (durationMinutes > MAX_APPOINTMENT_MINUTES) {
      throw new BadRequestException(
        `La sesión no puede superar ${MAX_APPOINTMENT_MINUTES / 60} horas`,
      );
    }

    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: dto.providerProfileId },
    });
    if (!provider || !provider.isAvailable) {
      throw new NotFoundException('Provider not found or not available');
    }

    const children = await this.prisma.child.findMany({
      where: { consumerProfileId: profile.id },
      select: { id: true },
    });
    if (children.length === 0) {
      throw new BadRequestException(
        'Add at least one child to your profile before requesting an appointment',
      );
    }

    const child = await this.prisma.child.findFirst({
      where: {
        id: dto.childId,
        consumerProfileId: profile.id,
      },
    });
    if (!child) {
      throw new BadRequestException(
        'childId must be one of your registered children',
      );
    }

    const blocks = await this.prisma.providerAvailabilityBlock.findMany({
      where: {
        providerProfileId: dto.providerProfileId,
        endsAt: { gt: now },
      },
    });

    const alternative = dto.requestsAlternativeSchedule === true;

    if (!alternative) {
      const fits = blocks.some((b) =>
        containedInBlock(startsAt, endsAt, b.startsAt, b.endsAt),
      );
      if (!fits) {
        throw new BadRequestException(
          'Requested time is not within an availability block for this educator',
        );
      }
    } else {
      const note = dto.noteFromFamily?.trim() ?? '';
      if (note.length < 15) {
        throw new BadRequestException(
          'For a custom time request, add a note of at least 15 characters for the educator',
        );
      }
      const altMax = utcMaxInstantForAlternativeRequest(now);
      if (
        startsAt.getTime() > altMax.getTime() ||
        endsAt.getTime() > altMax.getTime()
      ) {
        throw new BadRequestException(
          `Las peticiones con otro horario solo admiten fechas dentro de los próximos ${ALTERNATIVE_SCHEDULE_UTC_DAY_SPAN} días calendario.`,
        );
      }
    }

    const sm = provider.serviceMode ?? ServiceMode.IN_PERSON;
    let attendance: AppointmentAttendance;
    if (sm === ServiceMode.IN_PERSON) {
      attendance = AppointmentAttendance.IN_PERSON;
    } else if (sm === ServiceMode.ONLINE) {
      attendance = AppointmentAttendance.ONLINE;
    } else {
      if (isBabysitterOnlyKinds(provider.kinds)) {
        attendance = AppointmentAttendance.IN_PERSON;
      } else if (!dto.attendanceMode) {
        throw new BadRequestException(
          'Indica si la sesión será presencial o en línea',
        );
      } else {
        attendance = dto.attendanceMode;
      }
    }

    const meetingTrim = dto.meetingUrl?.trim();
    const meetingUrl =
      attendance === AppointmentAttendance.ONLINE &&
      meetingTrim &&
      meetingTrim.length > 0
        ? meetingTrim
        : null;

    const offerIdTrim = dto.providerOfferId?.trim() ?? '';
    let providerOfferId: string | null = null;
    let offerTitleSnapshot: string | null = null;
    let quotedPriceMinor: number | null = null;
    let quotedCurrency: string | null = null;

    if (offerIdTrim) {
      const offer = await this.prisma.providerOffer.findFirst({
        where: {
          id: offerIdTrim,
          providerProfileId: dto.providerProfileId,
          status: ProviderOfferStatus.PUBLISHED,
        },
        select: {
          id: true,
          title: true,
          priceMinor: true,
          currency: true,
          durationMinutes: true,
        },
      });
      if (!offer) {
        throw new BadRequestException(
          'La oferta indicada no es válida o no está publicada para este educador.',
        );
      }
      const durationDiff = Math.abs(durationMinutes - offer.durationMinutes);
      if (durationDiff > 1) {
        throw new BadRequestException(
          `La duración de la reserva (${durationMinutes} min) debe coincidir con la oferta «${offer.title.trim() || 'oferta'}» (${offer.durationMinutes} min).`,
        );
      }
      providerOfferId = offer.id;
      offerTitleSnapshot = offer.title.trim() || null;
      quotedPriceMinor = offer.priceMinor;
      quotedCurrency = offer.currency.trim().toUpperCase() || 'COP';
    } else {
      const rates = await this.prisma.providerRate.findMany({
        where: { providerProfileId: dto.providerProfileId },
        orderBy: { sortOrder: 'asc' },
        select: { unit: true, amountMinor: true, currency: true },
      });
      const quoted = quoteFromProviderRates(rates, durationMinutes);
      if (!quoted) {
        throw new BadRequestException(
          'Este educador no tiene tarifas publicadas para calcular el precio según la duración. Publica al menos una tarifa por hora (o por sesión) o elige una oferta al reservar.',
        );
      }
      quotedPriceMinor = quoted.priceMinor;
      quotedCurrency = quoted.currency;
    }

    return this.prisma.appointment.create({
      data: {
        providerProfileId: dto.providerProfileId,
        consumerProfileId: profile.id,
        startsAt,
        endsAt,
        status: AppointmentStatus.PENDING,
        requestsAlternativeSchedule: alternative,
        noteFromFamily: dto.noteFromFamily?.trim() || null,
        childId: dto.childId,
        meetingUrl,
        attendanceMode: attendance,
        inPersonVenueHost: InPersonVenueHost.CONSUMER,
        providerOfferId,
        offerTitleSnapshot,
        quotedPriceMinor,
        quotedCurrency,
      },
      include: this.appointmentInclude(),
    });
  }

  async patch(clerkUserId: string, appointmentId: string, dto: PatchAppointmentDto) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        providerProfile: true,
        consumerProfile: true,
      },
    });
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const logistics = this.logisticsUpdateFromDto(dto);
    const hasLogistics = Object.keys(logistics).length > 0;
    const next = dto.status;

    if (user.role === UserRole.CONSUMER) {
      const profile = user.consumerProfile;
      if (!profile || appt.consumerProfileId !== profile.id) {
        throw new ForbiddenException('Not your appointment');
      }

      if (next !== undefined && next !== AppointmentStatus.CANCELLED_BY_FAMILY) {
        throw new BadRequestException(
          'Las familias solo pueden cancelar la cita o actualizar enlace de reunión, modalidad (presencial/en línea) y lugar presencial.',
        );
      }

      if (next === AppointmentStatus.CANCELLED_BY_FAMILY) {
        if (
          appt.status !== AppointmentStatus.PENDING &&
          appt.status !== AppointmentStatus.CONFIRMED
        ) {
          throw new BadRequestException('This appointment cannot be cancelled');
        }
        return this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: AppointmentStatus.CANCELLED_BY_FAMILY,
            ...logistics,
          },
          include: this.appointmentInclude(),
        });
      }

      if (hasLogistics) {
        return this.prisma.appointment.update({
          where: { id: appointmentId },
          data: logistics,
          include: this.appointmentInclude(),
        });
      }

      throw new BadRequestException('Nada que actualizar');
    }

    if (user.role === UserRole.PROVIDER) {
      const profile = user.providerProfile;
      if (!profile || appt.providerProfileId !== profile.id) {
        throw new ForbiddenException('Not your appointment');
      }

      if (next === undefined) {
        if (!hasLogistics) {
          throw new BadRequestException('Nada que actualizar');
        }
        return this.prisma.appointment.update({
          where: { id: appointmentId },
          data: logistics,
          include: this.appointmentInclude(),
        });
      }

      if (next === AppointmentStatus.COMPLETED) {
        if (appt.status !== AppointmentStatus.CONFIRMED) {
          throw new BadRequestException(
            'Solo se pueden marcar como completadas las citas confirmadas.',
          );
        }
        const now = new Date();
        if (appt.endsAt.getTime() > now.getTime()) {
          throw new BadRequestException(
            'Solo puedes marcar como completada la sesión cuando haya pasado la hora de fin.',
          );
        }
        return this.prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: AppointmentStatus.COMPLETED, ...logistics },
          include: this.appointmentInclude(),
        });
      }

      if (
        next !== AppointmentStatus.CONFIRMED &&
        next !== AppointmentStatus.DECLINED &&
        next !== AppointmentStatus.CANCELLED_BY_PROVIDER
      ) {
        throw new BadRequestException(
          'Estado no válido: como educador puedes confirmar, rechazar, cancelar o completar citas.',
        );
      }

      if (next === AppointmentStatus.CANCELLED_BY_PROVIDER) {
        if (
          appt.status !== AppointmentStatus.PENDING &&
          appt.status !== AppointmentStatus.CONFIRMED
        ) {
          throw new BadRequestException('This appointment cannot be cancelled');
        }
        return this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: AppointmentStatus.CANCELLED_BY_PROVIDER,
            ...logistics,
          },
          include: this.appointmentInclude(),
        });
      }

      if (appt.status !== AppointmentStatus.PENDING && next === AppointmentStatus.CONFIRMED) {
        throw new BadRequestException(
          'Solo se pueden confirmar citas que siguen pendientes.',
        );
      }
      if (appt.status !== AppointmentStatus.PENDING && next === AppointmentStatus.DECLINED) {
        throw new BadRequestException(
          'Solo se pueden rechazar citas que siguen pendientes.',
        );
      }

      if (next === AppointmentStatus.CONFIRMED) {
        const confirmed = await this.prisma.appointment.findMany({
          where: {
            providerProfileId: appt.providerProfileId,
            status: AppointmentStatus.CONFIRMED,
            id: { not: appointmentId },
          },
        });
        for (const other of confirmed) {
          if (
            rangesOverlap(
              appt.startsAt,
              appt.endsAt,
              other.startsAt,
              other.endsAt,
            )
          ) {
            throw new BadRequestException(
              'Ya tienes otra cita confirmada que se solapa con este horario. Cancela o reprograma la otra antes de confirmar esta.',
            );
          }
        }
        await this.payments.chargeAppointmentOnProviderAccept(appointmentId);
      }

      const updated = await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: next, ...logistics },
        include: this.appointmentInclude(),
      });
      if (next === AppointmentStatus.CONFIRMED) {
        await this.chat.ensureThreadForPair(
          updated.consumerProfileId,
          updated.providerProfileId,
        );
      }
      return updated;
    }

    throw new ForbiddenException(
      'Tu cuenta no tiene un rol que pueda modificar esta cita (se requiere familia o educador).',
    );
  }

  async submitReview(
    clerkUserId: string,
    appointmentId: string,
    dto: CreateAppointmentReviewDto,
  ) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { reviews: true },
    });
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }
    if (appt.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Solo puedes valorar citas ya marcadas como completadas.',
      );
    }

    const user = await this.users.findByClerkOrThrow(clerkUserId);
    let authorRole: AppointmentReviewAuthor;
    if (user.role === UserRole.CONSUMER) {
      const profile = user.consumerProfile;
      if (!profile || appt.consumerProfileId !== profile.id) {
        throw new ForbiddenException('Not your appointment');
      }
      authorRole = AppointmentReviewAuthor.CONSUMER;
    } else if (user.role === UserRole.PROVIDER) {
      const profile = user.providerProfile;
      if (!profile || appt.providerProfileId !== profile.id) {
        throw new ForbiddenException('Not your appointment');
      }
      authorRole = AppointmentReviewAuthor.PROVIDER;
    } else {
      throw new ForbiddenException('Rol no válido');
    }

    if (appt.reviews.some((r) => r.authorRole === authorRole)) {
      throw new BadRequestException('Ya enviaste tu valoración para esta cita.');
    }

    const commentTrim = dto.comment?.trim() ?? '';
    const comment = commentTrim.length > 0 ? commentTrim : null;

    return this.prisma.$transaction(async (tx) => {
      await tx.appointmentReview.create({
        data: {
          appointmentId,
          authorRole,
          stars: dto.stars,
          comment,
        },
      });
      if (authorRole === AppointmentReviewAuthor.CONSUMER) {
        await this.recalcProviderRatingFromConsumerReviews(
          tx,
          appt.providerProfileId,
        );
      }
      return tx.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: this.appointmentInclude(),
      });
    });
  }

  private async recalcProviderRatingFromConsumerReviews(
    tx: Prisma.TransactionClient,
    providerProfileId: string,
  ) {
    const agg = await tx.appointmentReview.aggregate({
      where: {
        authorRole: AppointmentReviewAuthor.CONSUMER,
        appointment: {
          providerProfileId,
          status: AppointmentStatus.COMPLETED,
        },
      },
      _avg: { stars: true },
      _count: { _all: true },
    });
    const count = agg._count._all;
    const avgStars =
      count === 0 || agg._avg.stars == null ? 0 : Number(agg._avg.stars);
    const clamped = Math.min(5, Math.max(0, avgStars));
    await tx.providerProfile.update({
      where: { id: providerProfileId },
      data: {
        averageRating: new Prisma.Decimal(clamped.toFixed(2)),
        ratingCount: count,
      },
    });
  }

  async dismissReviewPrompt(clerkUserId: string, appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { reviews: true },
    });
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }
    if (appt.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Acción no aplicable a esta cita.');
    }

    const user = await this.users.findByClerkOrThrow(clerkUserId);
    if (user.role === UserRole.CONSUMER) {
      const profile = user.consumerProfile;
      if (!profile || appt.consumerProfileId !== profile.id) {
        throw new ForbiddenException('Not your appointment');
      }
      if (
        appt.reviews.some((r) => r.authorRole === AppointmentReviewAuthor.CONSUMER)
      ) {
        return this.prisma.appointment.findUniqueOrThrow({
          where: { id: appointmentId },
          include: this.appointmentInclude(),
        });
      }
      if (appt.consumerReviewPromptDismissals >= 2) {
        return this.prisma.appointment.findUniqueOrThrow({
          where: { id: appointmentId },
          include: this.appointmentInclude(),
        });
      }
      return this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          consumerReviewPromptDismissals: { increment: 1 },
        },
        include: this.appointmentInclude(),
      });
    }

    if (user.role === UserRole.PROVIDER) {
      const profile = user.providerProfile;
      if (!profile || appt.providerProfileId !== profile.id) {
        throw new ForbiddenException('Not your appointment');
      }
      if (
        appt.reviews.some((r) => r.authorRole === AppointmentReviewAuthor.PROVIDER)
      ) {
        return this.prisma.appointment.findUniqueOrThrow({
          where: { id: appointmentId },
          include: this.appointmentInclude(),
        });
      }
      if (appt.providerReviewPromptDismissals >= 2) {
        return this.prisma.appointment.findUniqueOrThrow({
          where: { id: appointmentId },
          include: this.appointmentInclude(),
        });
      }
      return this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          providerReviewPromptDismissals: { increment: 1 },
        },
        include: this.appointmentInclude(),
      });
    }

    throw new ForbiddenException('Rol no válido');
  }
}
