import { Injectable, Logger } from '@nestjs/common';
import { PushDevicePlatform } from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerDevice(userId: string, platform: PushDevicePlatform, token: string) {
    const cleanToken = token.trim();
    return this.prisma.pushDevice.upsert({
      where: {
        userId_token: { userId, token: cleanToken },
      },
      create: {
        userId,
        platform,
        token: cleanToken,
      },
      update: {
        platform,
        lastSeenAt: new Date(),
      },
    });
  }

  async unregisterDevice(userId: string, token: string) {
    const cleanToken = token.trim();
    await this.prisma.pushDevice.deleteMany({
      where: { userId, token: cleanToken },
    });
    return { deleted: true };
  }

  async notifyNewChatMessage(input: {
    recipientUserId: string;
    senderDisplayName: string;
    threadId: string;
    text: string;
  }) {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId: input.recipientUserId },
      select: { token: true, platform: true },
    });
    if (devices.length === 0) return;

    const expoEnabled = Boolean(process.env.EXPO_PUSH_ACCESS_TOKEN);
    if (!expoEnabled) {
      this.logger.debug(
        `Push skipped (EXPO_PUSH_ACCESS_TOKEN missing). devices=${devices.length}`,
      );
      return;
    }

    const expoTokens = devices
      .filter(
        (d: { token: string; platform: PushDevicePlatform }) =>
          d.platform === PushDevicePlatform.IOS ||
          d.platform === PushDevicePlatform.ANDROID,
      )
      .map((d: { token: string }) => d.token)
      .filter(
        (t: string) =>
          t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['),
      );
    if (expoTokens.length === 0) return;

    await Promise.allSettled(
      expoTokens.map(async (token: string) => {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: token,
            sound: 'default',
            title: `Nuevo mensaje de ${input.senderDisplayName}`,
            body: input.text.slice(0, 140),
            data: {
              kind: 'chat_message',
              threadId: input.threadId,
            },
          }),
        });
        if (!res.ok) {
          this.logger.warn(`Expo push failed status=${res.status}`);
        }
      }),
    );
  }
}
