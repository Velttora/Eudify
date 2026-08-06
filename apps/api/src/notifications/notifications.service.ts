import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@repo/database';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildEventNotificationHtml,
  buildEventNotificationPlainText,
} from '../mail/event-notification.mail';

export type CreateUserNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  /** If set, also email this address (skips invalid/placeholder emails). */
  email?: string | null;
  emailGreetingName?: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private webOrigin(): string {
    const raw = process.env.WEB_ORIGIN?.split(',')[0]?.trim();
    if (raw) return raw.replace(/\/$/, '');
    return process.env.NODE_ENV === 'production'
      ? 'https://eudify.co'
      : 'http://localhost:3000';
  }

  private isMailableEmail(email: string | null | undefined): email is string {
    const t = email?.trim().toLowerCase() ?? '';
    if (!t.includes('@')) return false;
    if (t.endsWith('@users.clerk.placeholder')) return false;
    return true;
  }

  async createAndEmail(input: CreateUserNotificationInput) {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });

    let emailSentAt: Date | null = null;
    if (this.isMailableEmail(input.email)) {
      const ctaUrl = input.href
        ? `${this.webOrigin()}${input.href.startsWith('/') ? '' : '/'}${input.href}`
        : this.webOrigin();
      const payload = {
        subject: `[Eudify] ${input.title}`,
        greetingName: input.emailGreetingName ?? null,
        title: input.title,
        bodyLines: input.body.split(/\n+/).map((l) => l.trim()).filter(Boolean),
        ctaLabel: 'Abrir en Eudify',
        ctaUrl,
      };
      try {
        await this.mail.sendEventNotification(input.email, payload);
        emailSentAt = new Date();
        await this.prisma.notification.update({
          where: { id: row.id },
          data: { emailSentAt },
        });
      } catch (err) {
        this.logger.error(
          `Email notification failed for ${row.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    return { ...row, emailSentAt };
  }

  async listMine(clerkUserId: string, take = 30) {
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const limit = Math.min(50, Math.max(1, take));
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    return {
      unreadCount,
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        entityType: n.entityType,
        entityId: n.entityId,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    };
  }

  async markRead(clerkUserId: string, notificationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId: user.id },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    if (existing.readAt) return existing;

    return this.prisma.notification.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(clerkUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  }

  // ── Domain helpers ────────────────────────────────────────────────────────

  async notifyProviderNewAppointment(params: {
    providerUserId: string;
    providerEmail: string | null;
    providerName: string | null;
    consumerName: string | null;
    startsAt: Date;
    endsAt: Date;
    appointmentId: string;
  }) {
    const when = formatRangeEs(params.startsAt, params.endsAt);
    const family = params.consumerName?.trim() || 'Una familia';
    await this.createAndEmail({
      userId: params.providerUserId,
      type: NotificationType.APPOINTMENT_REQUESTED,
      title: 'Nueva solicitud de cita',
      body: `${family} solicitó una sesión el ${when}.\nRevisa y confirma o rechaza la solicitud.`,
      href: '/dashboard/provider/agenda',
      entityType: 'appointment',
      entityId: params.appointmentId,
      email: params.providerEmail,
      emailGreetingName: params.providerName,
    });
  }

  async notifyConsumerAppointmentDecision(params: {
    consumerUserId: string;
    consumerEmail: string | null;
    consumerName: string | null;
    providerName: string | null;
    startsAt: Date;
    endsAt: Date;
    appointmentId: string;
    decision: 'CONFIRMED' | 'DECLINED' | 'CANCELLED_BY_PROVIDER';
  }) {
    const when = formatRangeEs(params.startsAt, params.endsAt);
    const educator = params.providerName?.trim() || 'El educador';
    const map = {
      CONFIRMED: {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Cita confirmada',
        body: `${educator} confirmó tu sesión del ${when}.`,
      },
      DECLINED: {
        type: NotificationType.APPOINTMENT_DECLINED,
        title: 'Cita rechazada',
        body: `${educator} no pudo aceptar tu solicitud del ${when}.`,
      },
      CANCELLED_BY_PROVIDER: {
        type: NotificationType.APPOINTMENT_CANCELLED_BY_PROVIDER,
        title: 'Cita cancelada por el educador',
        body: `${educator} canceló la sesión del ${when}.`,
      },
    } as const;
    const copy = map[params.decision];
    await this.createAndEmail({
      userId: params.consumerUserId,
      type: copy.type,
      title: copy.title,
      body: copy.body,
      href: '/dashboard/consumer?seccion=citas',
      entityType: 'appointment',
      entityId: params.appointmentId,
      email: params.consumerEmail,
      emailGreetingName: params.consumerName,
    });
  }

  async notifyProviderFamilyCancelled(params: {
    providerUserId: string;
    providerEmail: string | null;
    providerName: string | null;
    consumerName: string | null;
    startsAt: Date;
    endsAt: Date;
    appointmentId: string;
  }) {
    const when = formatRangeEs(params.startsAt, params.endsAt);
    const family = params.consumerName?.trim() || 'La familia';
    await this.createAndEmail({
      userId: params.providerUserId,
      type: NotificationType.APPOINTMENT_CANCELLED_BY_FAMILY,
      title: 'Cita cancelada por la familia',
      body: `${family} canceló la sesión del ${when}.`,
      href: '/dashboard/provider/agenda',
      entityType: 'appointment',
      entityId: params.appointmentId,
      email: params.providerEmail,
      emailGreetingName: params.providerName,
    });
  }

  async notifyChatMessage(params: {
    recipientUserId: string;
    recipientEmail: string | null;
    recipientName: string | null;
    senderDisplayName: string;
    threadId: string;
    textPreview: string;
    unreadCount: number;
    recipientRole: 'CONSUMER' | 'PROVIDER' | null;
  }) {
    const count = Math.max(1, Math.floor(params.unreadCount || 1));
    const preview =
      params.textPreview.length > 140
        ? `${params.textPreview.slice(0, 137)}…`
        : params.textPreview;
    const href =
      params.recipientRole === 'PROVIDER'
        ? '/dashboard/provider/chat'
        : '/dashboard/consumer/chat';
    const title =
      count === 1
        ? `Mensaje sin leer de ${params.senderDisplayName}`
        : `${count} mensajes sin leer de ${params.senderDisplayName}`;
    const body =
      count === 1
        ? preview
        : `Tienes ${count} mensajes sin leer. Último: ${preview}`;

    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: params.recipientUserId,
        type: NotificationType.CHAT_MESSAGE,
        entityType: 'chat_thread',
        entityId: params.threadId,
        readAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      // Same unread burst: refresh copy only, never a second email/item.
      return this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          title,
          body,
          href,
          // Bump so it stays near the top of the list.
          createdAt: new Date(),
        },
      });
    }

    return this.createAndEmail({
      userId: params.recipientUserId,
      type: NotificationType.CHAT_MESSAGE,
      title,
      body,
      href,
      entityType: 'chat_thread',
      entityId: params.threadId,
      email: params.recipientEmail,
      emailGreetingName: params.recipientName,
    });
  }

  /** Clear chat digests when the user opens/reads that conversation. */
  async markChatThreadNotificationsRead(userId: string, threadId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        type: NotificationType.CHAT_MESSAGE,
        entityType: 'chat_thread',
        entityId: threadId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }
}

function formatRangeEs(start: Date, end: Date): string {
  const a = start.toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const b = end.toLocaleTimeString('es', { timeStyle: 'short' });
  return `${a} – ${b}`;
}
