import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  ChatMessageStatus,
  Prisma,
  PushDevicePlatform,
} from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { UsersService } from '../users/users.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

type ChatContext = {
  thread: {
    id: string;
    consumerProfileId: string;
    providerProfileId: string;
  };
  actorUserId: string;
  counterpartUserId: string;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly sendBurstByUser = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly realtime: ChatRealtimeService,
    private readonly push: PushService,
  ) {}

  private assertChatEnabled() {
    const flag = (process.env.CHAT_ENABLED ?? 'true').trim().toLowerCase();
    if (flag === 'false' || flag === '0' || flag === 'off') {
      throw new ServiceUnavailableException('Chat feature is disabled');
    }
  }

  private assertSendRateLimit(userId: string) {
    const now = Date.now();
    const windowMs = Number(process.env.CHAT_RATE_WINDOW_MS ?? 30_000);
    const maxMessages = Number(process.env.CHAT_RATE_MAX_MESSAGES ?? 25);
    const existing = this.sendBurstByUser.get(userId) ?? [];
    const fresh = existing.filter((ts) => now - ts <= windowMs);
    if (fresh.length >= maxMessages) {
      throw new HttpException(
        'Too many chat messages, retry shortly',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    fresh.push(now);
    this.sendBurstByUser.set(userId, fresh);
  }

  private async requireActor(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const consumerProfileId = user.consumerProfile?.id ?? null;
    const providerProfileId = user.providerProfile?.id ?? null;
    return {
      userId: user.id,
      consumerProfileId,
      providerProfileId,
    };
  }

  async resolveSocketActor(clerkUserId: string) {
    const actor = await this.requireActor(clerkUserId);
    return { userId: actor.userId };
  }

  async assertThreadParticipant(clerkUserId: string, threadId: string) {
    await this.resolveThreadContext(clerkUserId, threadId);
    return { ok: true };
  }

  private async resolveThreadContext(
    clerkUserId: string,
    threadId: string,
  ): Promise<ChatContext> {
    const actor = await this.requireActor(clerkUserId);
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        consumerProfile: { select: { userId: true } },
        providerProfile: { select: { userId: true } },
      },
    });
    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }

    const isConsumerParticipant =
      actor.consumerProfileId != null &&
      actor.consumerProfileId === thread.consumerProfileId;
    const isProviderParticipant =
      actor.providerProfileId != null &&
      actor.providerProfileId === thread.providerProfileId;
    if (!isConsumerParticipant && !isProviderParticipant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }

    const counterpartUserId = isConsumerParticipant
      ? thread.providerProfile.userId
      : thread.consumerProfile.userId;

    return {
      thread: {
        id: thread.id,
        consumerProfileId: thread.consumerProfileId,
        providerProfileId: thread.providerProfileId,
      },
      actorUserId: actor.userId,
      counterpartUserId,
    };
  }

  async ensureThreadForAppointment(appointmentId: string) {
    this.assertChatEnabled();
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        consumerProfileId: true,
        providerProfileId: true,
        status: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Chat thread can only be initialized from confirmed appointments',
      );
    }
    return this.ensureThreadForPair(
      appointment.consumerProfileId,
      appointment.providerProfileId,
    );
  }

  async ensureThreadForPair(consumerProfileId: string, providerProfileId: string) {
    this.assertChatEnabled();
    return this.prisma.chatThread.upsert({
      where: {
        consumerProfileId_providerProfileId: { consumerProfileId, providerProfileId },
      },
      create: {
        consumerProfileId,
        providerProfileId,
      },
      update: {},
    });
  }

  async listMyThreads(clerkUserId: string) {
    this.assertChatEnabled();
    const actor = await this.requireActor(clerkUserId);
    if (!actor.consumerProfileId && !actor.providerProfileId) {
      return [];
    }

    // Backfill lazy: si hay citas confirmadas previas a la salida del módulo de chat,
    // crea/reusa su thread para que no aparezca "sin chats".
    const confirmedAppointments = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        OR: [
          actor.consumerProfileId
            ? { consumerProfileId: actor.consumerProfileId }
            : undefined,
          actor.providerProfileId
            ? { providerProfileId: actor.providerProfileId }
            : undefined,
        ].filter(Boolean) as Prisma.AppointmentWhereInput[],
      },
      select: { consumerProfileId: true, providerProfileId: true },
      distinct: ['consumerProfileId', 'providerProfileId'],
    });
    if (confirmedAppointments.length > 0) {
      await Promise.all(
        confirmedAppointments.map((a) =>
          this.ensureThreadForPair(a.consumerProfileId, a.providerProfileId),
        ),
      );
    }

    const where: Prisma.ChatThreadWhereInput = {
      OR: [
        actor.consumerProfileId
          ? { consumerProfileId: actor.consumerProfileId }
          : undefined,
        actor.providerProfileId
          ? { providerProfileId: actor.providerProfileId }
          : undefined,
      ].filter(Boolean) as Prisma.ChatThreadWhereInput[],
    };
    const rows = await this.prisma.chatThread.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        consumerProfile: {
          select: { id: true, fullName: true, photoUrl: true, userId: true },
        },
        providerProfile: {
          select: { id: true, fullName: true, photoUrl: true, userId: true },
        },
        participants: {
          where: { userId: actor.userId },
          select: { lastReadAt: true, lastReadMessageId: true },
          take: 1,
        },
        messages: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            text: true,
            createdAt: true,
            senderUserId: true,
            status: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return Promise.all(
      rows.map(async (row) => {
        const isConsumer = actor.consumerProfileId === row.consumerProfileId;
        const counterpart = isConsumer ? row.providerProfile : row.consumerProfile;
        const participant = row.participants[0] ?? null;
        const lastMessage = row.messages[0] ?? null;
        const latestAppointment = await this.prisma.appointment.findFirst({
          where: {
            consumerProfileId: row.consumerProfileId,
            providerProfileId: row.providerProfileId,
            status: {
              in: [
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.COMPLETED,
              ],
            },
          },
          orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
            attendanceMode: true,
            requestsAlternativeSchedule: true,
            offerTitleSnapshot: true,
            child: {
              select: { firstName: true },
            },
          },
        });
        return {
          id: row.id,
          consumerProfileId: row.consumerProfileId,
          providerProfileId: row.providerProfileId,
          lastMessageAt: row.lastMessageAt ?? lastMessage?.createdAt ?? row.updatedAt,
          lastMessagePreview: row.lastMessagePreview ?? lastMessage?.text ?? null,
          totalMessages: row._count.messages,
          me: {
            userId: actor.userId,
            role: isConsumer ? 'CONSUMER' : 'PROVIDER',
            lastReadAt: participant?.lastReadAt ?? null,
            lastReadMessageId: participant?.lastReadMessageId ?? null,
          },
          counterpart: {
            userId: counterpart.userId,
            profileId: counterpart.id,
            fullName: counterpart.fullName,
            photoUrl: counterpart.photoUrl,
            role: isConsumer ? 'PROVIDER' : 'CONSUMER',
          },
          sessionContext: latestAppointment
            ? {
                appointmentId: latestAppointment.id,
                childFirstName: latestAppointment.child?.firstName ?? null,
                offerTitle: latestAppointment.offerTitleSnapshot ?? null,
                startsAt: latestAppointment.startsAt,
                endsAt: latestAppointment.endsAt,
                status: latestAppointment.status,
                attendanceMode: latestAppointment.attendanceMode ?? null,
                requestsAlternativeSchedule:
                  latestAppointment.requestsAlternativeSchedule,
              }
            : null,
        };
      }),
    );
  }

  async listThreadMessages(
    clerkUserId: string,
    threadId: string,
    limit = 30,
    cursorId?: string,
  ) {
    this.assertChatEnabled();
    const ctx = await this.resolveThreadContext(clerkUserId, threadId);
    const normalizedLimit = Math.max(1, Math.min(limit, 100));
    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId: ctx.thread.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: normalizedLimit,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    const nextCursor = messages.length === normalizedLimit ? messages.at(-1)?.id : null;
    return {
      threadId: ctx.thread.id,
      items: messages,
      nextCursor,
    };
  }

  async sendMessage(clerkUserId: string, threadId: string, dto: SendChatMessageDto) {
    this.assertChatEnabled();
    const ctx = await this.resolveThreadContext(clerkUserId, threadId);
    this.assertSendRateLimit(ctx.actorUserId);
    const text = dto.text.trim();
    if (!text) {
      throw new BadRequestException('Message text is required');
    }
    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: dto.appointmentId,
          consumerProfileId: ctx.thread.consumerProfileId,
          providerProfileId: ctx.thread.providerProfileId,
        },
        select: { id: true },
      });
      if (!appointment) {
        throw new BadRequestException(
          'appointmentId must belong to the same family/educator pair',
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.clientMessageId?.trim()) {
        const existing = await tx.chatMessage.findUnique({
          where: {
            threadId_clientMessageId: {
              threadId: ctx.thread.id,
              clientMessageId: dto.clientMessageId.trim(),
            },
          },
        });
        if (existing) {
          return existing;
        }
      }

      const message = await tx.chatMessage.create({
        data: {
          threadId: ctx.thread.id,
          senderUserId: ctx.actorUserId,
          text,
          clientMessageId: dto.clientMessageId?.trim() || null,
          appointmentId: dto.appointmentId ?? null,
        },
      });

      await tx.chatThread.update({
        where: { id: ctx.thread.id },
        data: {
          lastMessageAt: message.createdAt,
          lastMessagePreview: text.slice(0, 280),
        },
      });

      await tx.chatParticipantState.upsert({
        where: {
          threadId_userId: {
            threadId: ctx.thread.id,
            userId: ctx.actorUserId,
          },
        },
        create: {
          threadId: ctx.thread.id,
          userId: ctx.actorUserId,
          lastReadMessageId: message.id,
          lastReadAt: message.createdAt,
        },
        update: {
          lastReadMessageId: message.id,
          lastReadAt: message.createdAt,
        },
      });

      await tx.chatParticipantState.upsert({
        where: {
          threadId_userId: {
            threadId: ctx.thread.id,
            userId: ctx.counterpartUserId,
          },
        },
        create: {
          threadId: ctx.thread.id,
          userId: ctx.counterpartUserId,
        },
        update: {},
      });

      return message;
    });

    this.realtime.emitNewMessage(ctx.thread.id, created);
    if (!this.realtime.isUserActiveInThread(ctx.counterpartUserId, ctx.thread.id)) {
      const actor = await this.prisma.user.findUnique({
        where: { id: ctx.actorUserId },
        select: {
          consumerProfile: { select: { fullName: true } },
          providerProfile: { select: { fullName: true } },
          email: true,
        },
      });
      const senderDisplayName =
        actor?.consumerProfile?.fullName?.trim() ||
        actor?.providerProfile?.fullName?.trim() ||
        actor?.email ||
        'Trofo';
      await this.push.notifyNewChatMessage({
        recipientUserId: ctx.counterpartUserId,
        senderDisplayName,
        threadId: ctx.thread.id,
        text,
      });
    }

    this.logger.debug(`message_sent thread=${ctx.thread.id} by=${ctx.actorUserId}`);

    return created;
  }

  async markThreadRead(clerkUserId: string, threadId: string, messageId: string) {
    this.assertChatEnabled();
    const ctx = await this.resolveThreadContext(clerkUserId, threadId);
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        threadId: ctx.thread.id,
      },
      select: { id: true, createdAt: true, senderUserId: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found in this thread');
    }

    await this.prisma.chatParticipantState.upsert({
      where: {
        threadId_userId: {
          threadId: ctx.thread.id,
          userId: ctx.actorUserId,
        },
      },
      create: {
        threadId: ctx.thread.id,
        userId: ctx.actorUserId,
        lastReadMessageId: message.id,
        lastReadAt: message.createdAt,
      },
      update: {
        lastReadMessageId: message.id,
        lastReadAt: message.createdAt,
      },
    });

    if (message.senderUserId !== ctx.actorUserId) {
      await this.prisma.chatMessage.update({
        where: { id: message.id },
        data: { status: ChatMessageStatus.READ },
      });
    }

    this.realtime.emitReadReceipt(ctx.thread.id, {
      threadId: ctx.thread.id,
      messageId: message.id,
      userId: ctx.actorUserId,
      readAt: message.createdAt,
    });

    return { ok: true };
  }

  async registerPushDevice(
    clerkUserId: string,
    platform: PushDevicePlatform,
    token: string,
  ) {
    this.assertChatEnabled();
    const actor = await this.requireActor(clerkUserId);
    return this.push.registerDevice(actor.userId, platform, token);
  }

  async unregisterPushDevice(clerkUserId: string, token: string) {
    this.assertChatEnabled();
    const actor = await this.requireActor(clerkUserId);
    return this.push.unregisterDevice(actor.userId, token);
  }
}
