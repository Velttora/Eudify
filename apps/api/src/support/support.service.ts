import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  ConsumerPlan,
  Prisma,
  SupportMessageAuthor,
  SupportResolutionKind,
  SupportTicketStatus,
  UserRole,
} from '@repo/database';
import { randomBytes } from 'crypto';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { AdminPatchTicketDto } from './dto/admin-patch-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import {
  DEFAULT_SUPPORT_CATEGORIES,
  DEFAULT_SUPPORT_RULES,
} from './support-default-catalog';
import {
  ResolutionContext,
  SupportResolutionService,
} from './support-resolution.service';

const HELP_COMPLETED_DAYS = 14;
const ABUSE_WINDOW_DAYS = 30;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly resolution: SupportResolutionService,
    private readonly mail: MailService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /** Familia+ es la única capa con "soporte prioritario directo" en la tabla de precios. */
  private async isPriorityCreator(consumerProfileId: string | undefined): Promise<boolean> {
    if (!consumerProfileId) return false;
    const current = await this.subscriptions.getPlanForConsumerProfile(consumerProfileId);
    return this.subscriptions.hasPlanAccess(current, ConsumerPlan.FAMILIA_PLUS);
  }

  /**
   * Si aún no hay catálogo (migración sin seed), inserta el mínimo para que el flujo guiado funcione.
   */
  private async ensureSupportCatalogSeeded(): Promise<void> {
    const activeCats = await this.prisma.supportComplaintCategory.count({
      where: { active: true },
    });
    if (activeCats === 0) {
      await this.prisma.supportComplaintCategory.createMany({
        data: DEFAULT_SUPPORT_CATEGORIES,
        skipDuplicates: true,
      });
    }
    const rules = await this.prisma.supportResolutionRule.count({
      where: { active: true },
    });
    if (rules === 0) {
      await this.prisma.supportResolutionRule.createMany({
        data: DEFAULT_SUPPORT_RULES,
      });
    }
  }

  async listCategories() {
    await this.ensureSupportCatalogSeeded();
    return this.prisma.supportComplaintCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        code: true,
        labelEs: true,
        descriptionEs: true,
        parentCode: true,
        sortOrder: true,
        flowHintJson: true,
      },
    });
  }

  async listMyTickets(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    return this.prisma.supportTicket.findMany({
      where: { createdByUserId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.ticketListInclude(),
    });
  }

  async getTicket(clerkUserId: string, ticketId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: this.ticketDetailInclude(),
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    await this.assertCanViewTicket(user.id, clerkUserId, ticket);
    return ticket;
  }

  async createTicket(clerkUserId: string, dto: CreateTicketDto) {
    await this.ensureSupportCatalogSeeded();
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const category = await this.prisma.supportComplaintCategory.findFirst({
      where: { code: dto.categoryCode, active: true },
    });
    if (!category) {
      throw new BadRequestException('Categoría no válida o inactiva.');
    }

    const appt = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: {
        consumerProfile: {
          include: { user: { select: { email: true } } },
        },
        providerProfile: {
          include: { user: { select: { email: true } } },
        },
      },
    });
    if (!appt) throw new NotFoundException('Cita no encontrada');

    this.assertPartyOnAppointment(user, appt);
    this.assertAppointmentHelpWindow(appt, new Date());

    const abuseScore = await this.computeAbuseScore(user.id);
    const rules = await this.prisma.supportResolutionRule.findMany({
      where: { active: true },
    });

    const metadata = (dto.metadata ?? {}) as Record<string, unknown>;
    const ctx: ResolutionContext = {
      categoryCode: dto.categoryCode,
      metadata,
      appointment: {
        status: appt.status,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
      },
      now: new Date(),
      abuseScore,
    };

    const outcome = this.resolution.evaluate(rules, ctx);
    const threshold = this.resolution.autoThreshold();

    let status: SupportTicketStatus = SupportTicketStatus.PENDING_AGENT;
    let resolutionKind: SupportResolutionKind =
      SupportResolutionKind.HUMAN;
    let proposedResolution: Prisma.InputJsonValue | undefined;
    let autoConfidence: Prisma.Decimal | null = null;

    if (outcome) {
      autoConfidence = new Prisma.Decimal(outcome.autoConfidence.toFixed(3));
      proposedResolution = {
        actionType: outcome.actionType,
        actionPayload: outcome.actionPayload,
        ruleId: outcome.ruleId,
        ruleName: outcome.ruleName,
      };

      if (this.resolution.shouldEscalateAction(outcome.actionType)) {
        status = SupportTicketStatus.ESCALATED;
        resolutionKind = SupportResolutionKind.HUMAN;
      } else if (outcome.autoConfidence >= threshold) {
        status = SupportTicketStatus.PENDING_USER;
        resolutionKind = SupportResolutionKind.AUTO;
      } else {
        status = SupportTicketStatus.PENDING_AGENT;
        resolutionKind = SupportResolutionKind.HUMAN;
      }
    }

    const formal = dto.formalComplaint === true;
    const formalTrackingNumber = formal
      ? this.nextFormalTrackingNumber()
      : null;
    const isPriority = await this.isPriorityCreator(user.consumerProfile?.id);

    const systemBody = this.buildSystemIntro({
      categoryLabel: category.labelEs,
      proposed: proposedResolution ?? null,
      status,
      formal,
      formalTrackingNumber,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          appointmentId: appt.id,
          createdByUserId: user.id,
          providerProfileId: appt.providerProfileId,
          categoryCode: dto.categoryCode,
          status,
          resolutionKind,
          isPriority,
          formalComplaint: formal,
          formalTrackingNumber,
          metadata: metadata as Prisma.InputJsonValue,
          proposedResolution,
          autoConfidence,
          abuseScoreSnapshot: new Prisma.Decimal(abuseScore.toFixed(3)),
        },
        include: this.ticketDetailInclude(),
      });

      await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: SupportMessageAuthor.SYSTEM,
          body: systemBody,
        },
      });

      if (dto.initialMessage?.trim()) {
        await tx.supportTicketMessage.create({
          data: {
            ticketId: ticket.id,
            authorType: SupportMessageAuthor.USER,
            authorUserId: user.id,
            body: dto.initialMessage.trim(),
          },
        });
      }

      if (dto.evidence?.length) {
        for (const ev of dto.evidence) {
          await tx.supportTicketEvidence.create({
            data: {
              ticketId: ticket.id,
              uploadedByUserId: user.id,
              fileUrl: ev.fileUrl,
              mimeType: ev.mimeType ?? null,
              label: ev.label ?? null,
            },
          });
        }
      }

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: this.ticketDetailInclude(),
      });
    });

    const consumerEmail = appt.consumerProfile.user.email;
    const providerEmail = appt.providerProfile.user.email;
    await this.mail.notifyTicketCreated({
      ticketId: created.id,
      appointmentId: appt.id,
      categoryLabel: category.labelEs,
      categoryCode: dto.categoryCode,
      status,
      formalComplaint: formal,
      formalTrackingNumber,
      creatorEmail: user.email,
      creatorName: user.consumerProfile?.fullName ?? user.providerProfile?.fullName ?? null,
      consumerEmail,
      consumerName: appt.consumerProfile.fullName,
      providerEmail,
      providerName: appt.providerProfile.fullName,
      initialMessage: dto.initialMessage ?? null,
    });

    return created;
  }

  async addMessage(clerkUserId: string, ticketId: string, body: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    await this.assertTicketOwner(user.id, ticket);

    if (ticket.status === SupportTicketStatus.RESOLVED) {
      throw new BadRequestException(
        'Este ticket ya no admite mensajes del usuario.',
      );
    }

    return this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        authorType: SupportMessageAuthor.USER,
        authorUserId: user.id,
        body,
      },
    });
  }

  async resolveTicket(
    clerkUserId: string,
    ticketId: string,
    dto: ResolveTicketDto,
  ) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    await this.assertTicketOwner(user.id, ticket);

    if (dto.acceptProposed !== true) {
      throw new BadRequestException('Debes aceptar la propuesta para resolver.');
    }
    if (!ticket.proposedResolution) {
      throw new BadRequestException('No hay propuesta automática que aceptar.');
    }
    if (ticket.status !== SupportTicketStatus.PENDING_USER) {
      throw new BadRequestException('Este ticket no está pendiente de tu respuesta.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          authorType: SupportMessageAuthor.USER,
          authorUserId: user.id,
          body: 'Acepto la solución propuesta por el sistema.',
        },
      });
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          authorType: SupportMessageAuthor.SYSTEM,
          body:
            'Ticket marcado como resuelto. Si necesitas facturación o reembolso, el equipo lo procesará según la política vigente.',
        },
      });
      return tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: SupportTicketStatus.RESOLVED,
          resolutionKind: SupportResolutionKind.AUTO,
          resolvedAt: new Date(),
        },
        include: this.ticketDetailInclude(),
      });
    });
  }

  async escalateTicket(
    clerkUserId: string,
    ticketId: string,
    dto: EscalateTicketDto,
  ) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    await this.assertTicketOwner(user.id, ticket);

    if (ticket.status === SupportTicketStatus.RESOLVED) {
      throw new BadRequestException('El ticket ya está resuelto.');
    }

    const reason = dto.reason?.trim() || 'El usuario solicitó revisión humana.';

    return this.prisma.$transaction(async (tx) => {
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          authorType: SupportMessageAuthor.USER,
          authorUserId: user.id,
          body: `Solicito escalación: ${reason}`,
        },
      });
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          authorType: SupportMessageAuthor.SYSTEM,
          body:
            'Tu caso ha pasado a un agente. Te responderemos lo antes posible según cola y SLA.',
        },
      });
      return tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: SupportTicketStatus.ESCALATED,
          resolutionKind: SupportResolutionKind.HUMAN,
          escalationReason: reason,
        },
        include: this.ticketDetailInclude(),
      });
    });
  }

  // --- Admin ---

  async adminListTickets(filters: {
    status?: SupportTicketStatus;
    categoryCode?: string;
    providerProfileId?: string;
  }) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.categoryCode) where.categoryCode = filters.categoryCode;
    if (filters.providerProfileId) {
      where.providerProfileId = filters.providerProfileId;
    }
    return this.prisma.supportTicket.findMany({
      where,
      orderBy: [{ isPriority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: this.ticketListInclude(),
    });
  }

  async adminPatchTicket(
    clerkUserId: string,
    ticketId: string,
    dto: AdminPatchTicketDto,
  ) {
    await this.users.findByClerkOrThrow(clerkUserId);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    const data: Prisma.SupportTicketUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.resolutionKind) data.resolutionKind = dto.resolutionKind;
    if (dto.status === SupportTicketStatus.RESOLVED && !ticket.resolvedAt) {
      data.resolvedAt = new Date();
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({
        where: { id: ticketId },
        data,
        include: this.ticketDetailInclude(),
      });
      if (dto.internalNote?.trim()) {
        const agent = await this.users.findByClerkOrThrow(clerkUserId);
        await tx.supportTicketMessage.create({
          data: {
            ticketId,
            authorType: SupportMessageAuthor.AGENT,
            authorUserId: agent.id,
            body: dto.internalNote.trim(),
            metadata: { internal: true } as Prisma.InputJsonValue,
          },
        });
      }
      return tx.supportTicket.findUniqueOrThrow({
        where: { id: ticketId },
        include: this.ticketDetailInclude(),
      });
    });
  }

  async adminAddMessage(clerkUserId: string, ticketId: string, body: string) {
    const agent = await this.users.findByClerkOrThrow(clerkUserId);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        authorType: SupportMessageAuthor.AGENT,
        authorUserId: agent.id,
        body,
      },
    });
  }

  async adminMetrics() {
    const [total, resolved, escalated, autoResolved] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({
        where: { status: SupportTicketStatus.RESOLVED },
      }),
      this.prisma.supportTicket.count({
        where: { status: SupportTicketStatus.ESCALATED },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: SupportTicketStatus.RESOLVED,
          resolutionKind: SupportResolutionKind.AUTO,
        },
      }),
    ]);

    const byCategory = await this.prisma.supportTicket.groupBy({
      by: ['categoryCode'],
      _count: { id: true },
    });

    const byEducator = await this.prisma.supportTicket.groupBy({
      by: ['providerProfileId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 12,
    });

    return {
      totalTickets: total,
      resolvedCount: resolved,
      escalatedCount: escalated,
      autoResolvedCount: autoResolved,
      manualResolvedApprox: Math.max(0, resolved - autoResolved),
      complaintRateByCategory: byCategory.map((r) => ({
        categoryCode: r.categoryCode,
        count: r._count.id,
      })),
      topEducatorsByTicketVolume: byEducator.map((r) => ({
        providerProfileId: r.providerProfileId,
        ticketCount: r._count.id,
      })),
    };
  }

  // --- helpers ---

  private ticketListInclude(): Prisma.SupportTicketInclude {
    return {
      appointment: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      },
    };
  }

  private ticketDetailInclude(): Prisma.SupportTicketInclude {
    return {
      appointment: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          consumerProfile: { select: { fullName: true } },
          providerProfile: { select: { fullName: true } },
        },
      },
      messages: { orderBy: { createdAt: 'asc' } },
      evidence: true,
    };
  }

  private assertPartyOnAppointment(
    user: {
      id: string;
      role: UserRole | null;
      consumerProfile: { id: string } | null;
      providerProfile: { id: string } | null;
    },
    appt: { consumerProfileId: string; providerProfileId: string },
  ) {
    if (user.role === UserRole.CONSUMER && user.consumerProfile) {
      if (appt.consumerProfileId !== user.consumerProfile.id) {
        throw new ForbiddenException('No es tu cita');
      }
      return;
    }
    if (user.role === UserRole.PROVIDER && user.providerProfile) {
      if (appt.providerProfileId !== user.providerProfile.id) {
        throw new ForbiddenException('No es tu cita');
      }
      return;
    }
    throw new ForbiddenException('Rol no válido para soporte de citas');
  }

  private assertAppointmentHelpWindow(
    appt: { status: AppointmentStatus; endsAt: Date },
    now: Date,
  ) {
    if (
      appt.status === AppointmentStatus.DECLINED ||
      appt.status === AppointmentStatus.CANCELLED_BY_FAMILY ||
      appt.status === AppointmentStatus.CANCELLED_BY_PROVIDER
    ) {
      throw new BadRequestException(
        'No se puede abrir soporte para citas canceladas o rechazadas.',
      );
    }

    if (appt.status === AppointmentStatus.COMPLETED) {
      const deadline = new Date(appt.endsAt);
      deadline.setDate(deadline.getDate() + HELP_COMPLETED_DAYS);
      if (now > deadline) {
        throw new BadRequestException(
          `Solo se admite soporte hasta ${HELP_COMPLETED_DAYS} días después de la sesión completada.`,
        );
      }
    }
  }

  private async assertTicketOwner(internalUserId: string, ticket: { createdByUserId: string }) {
    if (ticket.createdByUserId !== internalUserId) {
      throw new ForbiddenException('No tienes acceso a este ticket');
    }
  }

  private async assertCanViewTicket(
    internalUserId: string,
    clerkUserId: string,
    ticket: { createdByUserId: string },
  ) {
    const raw = process.env.SUPPORT_ADMIN_CLERK_IDS?.trim();
    const admins =
      raw?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (admins.includes(clerkUserId)) return;
    await this.assertTicketOwner(internalUserId, ticket);
  }

  private async computeAbuseScore(userId: string): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - ABUSE_WINDOW_DAYS);
    const n = await this.prisma.supportTicket.count({
      where: { createdByUserId: userId, createdAt: { gte: since } },
    });
    return Math.min(1, n / 8);
  }

  private nextFormalTrackingNumber(): string {
    const y = new Date().getFullYear();
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `PQR-${y}-${suffix}`;
  }

  private buildSystemIntro(args: {
    categoryLabel: string;
    proposed: Prisma.InputJsonValue | null;
    status: SupportTicketStatus;
    formal: boolean;
    formalTrackingNumber: string | null;
  }): string {
    const lines: string[] = [
      `Hemos registrado tu solicitud en la categoría «${args.categoryLabel}».`,
    ];
    if (args.formal && args.formalTrackingNumber) {
      lines.push(
        `Reclamación formal (PQR). Número de seguimiento: ${args.formalTrackingNumber}.`,
      );
    }
    if (args.proposed != null) {
      const p = args.proposed as Record<string, unknown>;
      lines.push(
        `Propuesta automática (${String(p.ruleName ?? 'regla')}): acción «${String(p.actionType)}».`,
      );
    } else {
      lines.push('No hay regla automática aplicable; un agente revisará tu caso.');
    }
    lines.push(`Estado del ticket: ${args.status}.`);
    lines.push(
      'Si recibes una propuesta automática y te parece adecuada, acéptala desde la app; si no, puedes escalar a un agente.',
    );
    return lines.join('\n\n');
  }
}

